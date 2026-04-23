import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import * as doctorService from '../services/doctor.service.js';
import * as pharmacyService from '../services/pharmacy.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../lib/prisma.js';

const resolveDoctorId = async (userId: number, clinicId: number) => {
    const staff = await prisma.clinicstaff.findFirst({
        where: { userId, clinicId }
    });
    return staff?.id || userId; // Fallback to userId if not found, but ideally should exist
};


export const getQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
    const doctorId = await resolveDoctorId(req.user!.id, req.clinicId!);
    const queue = await doctorService.getDoctorQueue(req.clinicId!, doctorId);
    res.status(200).json({ status: 'success', data: queue });
});


export const createAssessment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const doctorId = await resolveDoctorId(req.user!.id, req.clinicId!);
    const assessment = await doctorService.saveCompleteEMR(req.clinicId!, doctorId, req.body);
    res.status(201).json({ status: 'success', data: assessment });
});


export const getHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const history = await doctorService.getHistory(req.clinicId!, Number(req.params.patientId));
    res.status(200).json({ status: 'success', data: history });
});

export const getPatientProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await doctorService.getPatientFullProfile(req.clinicId!, Number(req.params.patientId));
    res.status(200).json({ status: 'success', data: profile });
});

export const getAllAssessments = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Determine user role within this clinic
    const staff = await prisma.clinicstaff.findFirst({
        where: { userId: req.user!.id, clinicId: req.clinicId }
    });

    let doctorId: number | undefined = undefined;

    // If user is a DOCTOR, filter by their ID. Otherwise (Admin/Doc Controller), show all.
    if (staff && staff.role === 'DOCTOR') {
        doctorId = staff.id;
    }

    const assessments = await doctorService.getAllAssessments(req.clinicId!, doctorId);
    res.status(200).json({ status: 'success', data: assessments });
});

export const getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const doctorId = await resolveDoctorId(req.user!.id, req.clinicId!);
    const stats = await doctorService.getDoctorStats(req.clinicId!, doctorId);
    res.status(200).json({ status: 'success', data: stats });
});


export const getActivities = asyncHandler(async (req: AuthRequest, res: Response) => {
    const doctorId = await resolveDoctorId(req.user!.id, req.clinicId!);
    const activities = await doctorService.getDoctorActivities(req.clinicId!, doctorId);
    res.status(200).json({ status: 'success', data: activities });
});


export const getTemplates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const clinicId = Number(req.clinicId || req.user?.clinicId || 0);
    const templates = await doctorService.getFormTemplates(clinicId);
    res.status(200).json({ status: 'success', data: templates });
});

export const getTemplateById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const clinicId = Number(req.clinicId || req.user?.clinicId || 0);
    const template = await doctorService.getTemplateById(clinicId, Number(req.params.id));
    res.status(200).json({ status: 'success', data: template });
});

export const getPatients = asyncHandler(async (req: AuthRequest, res: Response) => {
    const staff = await prisma.clinicstaff.findFirst({
        where: { userId: req.user!.id, clinicId: req.clinicId }
    });

    let patients;
    if (staff && staff.role === 'DOCTOR') {
        patients = await doctorService.getAssignedPatients(req.clinicId!, staff.id);
    } else {
        // Admin, Receptionist, Document Controller can see all clinic patients
        patients = await doctorService.getAllClinicPatients(req.clinicId!);
    }
    res.status(200).json({ status: 'success', data: patients });
});



export const createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const doctorId = await resolveDoctorId(req.user!.id, req.clinicId!);
    const order = await doctorService.createOrder(req.clinicId!, doctorId, req.body);
    res.status(201).json({ status: 'success', data: order });
});

export const getOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const doctorId = await resolveDoctorId(req.user!.id, req.clinicId!);
    const orders = await doctorService.getDoctorOrders(req.clinicId!, doctorId);
    res.status(200).json({ status: 'success', data: orders });
});

export const getPrescriptionInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const inventory = await pharmacyService.getInventory(req.clinicId!);
    res.status(200).json({ status: 'success', data: inventory });
});


export const getRevenue = asyncHandler(async (req: AuthRequest, res: Response) => {
    const doctorId = await resolveDoctorId(req.user!.id, req.clinicId!);
    const revenue = await doctorService.getRevenueStats(req.clinicId!, doctorId);
    res.status(200).json({ status: 'success', data: revenue });
});

