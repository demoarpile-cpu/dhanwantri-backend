import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import * as superService from '../services/super.service.js';
import bcrypt from 'bcryptjs';
// ==================== PLANS ====================
export const getPlans = asyncHandler(async (req, res) => {
    let plans = await prisma.subscription_plan.findMany({
        where: req.query.admin ? {} : { isActive: true },
        orderBy: { price: 'asc' }
    });
    // Auto-bootstrap defaults so plans page never stays empty.
    if (plans.length === 0) {
        await prisma.subscription_plan.createMany({
            data: [
                {
                    name: 'Starter',
                    price: 99,
                    duration: 'Monthly',
                    features: JSON.stringify(['Appointments', 'Billing', 'Patient Records']),
                    isActive: true
                },
                {
                    name: 'Professional',
                    price: 199,
                    duration: 'Monthly',
                    features: JSON.stringify(['Everything in Starter', 'Lab', 'Radiology', 'Pharmacy']),
                    isActive: true
                },
                {
                    name: 'Enterprise',
                    price: 499,
                    duration: 'Monthly',
                    features: JSON.stringify(['Everything in Professional', 'Multi Clinic', 'Priority Support']),
                    isActive: true
                }
            ]
        });
        plans = await prisma.subscription_plan.findMany({
            where: req.query.admin ? {} : { isActive: true },
            orderBy: { price: 'asc' }
        });
    }
    res.status(200).json({ success: true, data: plans });
});
export const createPlan = asyncHandler(async (req, res) => {
    const { name, price, duration, features } = req.body;
    const plan = await prisma.subscription_plan.create({
        data: {
            name,
            price,
            duration,
            features: JSON.stringify(features)
        }
    });
    res.status(201).json({ success: true, message: 'Plan created successfully', data: plan });
});
export const updatePlan = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, price, duration, features, isActive } = req.body;
    const plan = await prisma.subscription_plan.update({
        where: { id: Number(id) },
        data: {
            name,
            price,
            duration,
            features: typeof features === 'string' ? features : JSON.stringify(features),
            isActive
        }
    });
    res.status(200).json({ success: true, message: 'Plan updated successfully', data: plan });
});
export const deletePlan = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // Check if any registrations are using it. For MVP we'll just delete.
    await prisma.subscription_plan.delete({
        where: { id: Number(id) }
    });
    res.status(200).json({ success: true, message: 'Plan deleted successfully' });
});
// ==================== REGISTRATIONS ====================
export const createRegistration = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, address, planId, userType } = req.body;
    if (!firstName || !email || !password) {
        throw new AppError('Missing required fields', 400);
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new AppError('Email already in use', 400);
    }
    if (userType === 'PATIENT') {
        // Direct Patient Creation
        const hashedPassword = await bcrypt.hash(password, 10);
        const name = `${firstName} ${lastName}`.trim();
        const user = await prisma.user.create({
            data: {
                email,
                name: name,
                password: hashedPassword,
                role: 'PATIENT',
                status: 'active'
            }
        });
        // Patients must be linked to a clinic to login. 
        // We'll link them to the first available clinic globally or a default "Public" clinic.
        const firstClinic = await prisma.clinic.findFirst({
            orderBy: { id: 'asc' }
        });
        if (firstClinic) {
            await prisma.patient.create({
                data: {
                    name,
                    email,
                    address,
                    phone: '0000000000', // Default phone
                    clinicId: firstClinic.id
                }
            });
        }
        return res.status(201).json({
            success: true,
            message: 'Patient account created successfully. You can now login.',
            data: { id: user.id, email: user.email, role: 'PATIENT' }
        });
    }
    // Admin Flow (Approval Needed)
    const reqData = await prisma.registration_request.create({
        data: {
            firstName,
            lastName,
            email,
            password, // Approved flow typically uses registration password during clinic create
            address,
            planId: planId ? Number(planId) : null,
            status: 'PENDING'
        }
    });
    res.status(201).json({ success: true, message: 'Registration submitted successfully. Waiting for Admin approval.', data: reqData });
});
export const getRegistrations = asyncHandler(async (req, res) => {
    const requests = await prisma.registration_request.findMany({
        orderBy: { createdAt: 'desc' },
        include: { plan: true }
    });
    res.status(200).json({ success: true, data: requests });
});
export const approveRegistration = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const registration = await prisma.registration_request.findUnique({
        where: { id: Number(id) },
        include: { plan: true }
    });
    if (!registration)
        throw new AppError('Registration request not found', 404);
    if (registration.status !== 'PENDING')
        throw new AppError('Request is not in PENDING state', 400);
    // Create a new clinic for this registration
    const clinicName = `${registration.firstName}'s Clinic`;
    // Convert duration to months
    let durationInMonths = 1;
    let planType = 'Monthly';
    if (registration.plan) {
        if (registration.plan.duration.toLowerCase().includes('year')) {
            durationInMonths = 12;
            planType = 'Yearly';
        }
        else if (registration.plan.duration.toLowerCase().includes('month')) {
            durationInMonths = 1;
        }
        else {
            planType = registration.plan.name;
        }
    }
    const clinicData = {
        name: clinicName,
        location: registration.address || 'N/A', // Use address from registration as clinic location
        email: registration.email,
        contact: '0000000000', // Default or ask in form
        password: registration.password,
        subscriptionDuration: durationInMonths,
        subscriptionPlan: planType,
        numberOfUsers: 5, // Default limit
        subscriptionAmount: registration.plan ? registration.plan.price : 99,
        gstPercent: 0
    };
    // Use existing service to create clinic & admin user
    const clinic = await superService.createClinic(clinicData);
    // Mark registration as approved
    await prisma.registration_request.update({
        where: { id: Number(id) },
        data: { status: 'APPROVED' }
    });
    res.status(200).json({ success: true, message: 'Registration approved and Clinic created', data: clinic });
});
export const rejectRegistration = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.registration_request.update({
        where: { id: Number(id) },
        data: { status: 'REJECTED' }
    });
    res.status(200).json({ success: true, message: 'Registration rejected' });
});
