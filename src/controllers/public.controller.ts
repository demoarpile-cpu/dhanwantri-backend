import { Request, Response } from 'express';
import * as publicService from '../services/public.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getClinicDetails = asyncHandler(async (req: Request, res: Response) => {
    const { subdomain } = req.params;
    const clinic = await publicService.getClinicBySubdomain(subdomain as string);
    res.status(200).json({ success: true, data: clinic });
});

export const getClinicDoctors = asyncHandler(async (req: Request, res: Response) => {
    const { clinicId } = req.params;
    const doctors = await publicService.getClinicDoctors(Number(clinicId));
    res.status(200).json({ success: true, data: doctors });
});

export const getDoctorAvailability = asyncHandler(async (req: Request, res: Response) => {
    const { doctorId } = req.params;
    const { date } = req.query;
    const availability = await publicService.getDoctorAvailability(Number(doctorId), date as string);
    res.status(200).json({ success: true, data: availability });
});

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
    const booking = await publicService.createPublicBooking(req.body);
    res.status(201).json({ success: true, message: 'Appointment booked successfully', data: booking });
});

export const getTokens = asyncHandler(async (req: Request, res: Response) => {
    const { subdomain } = req.params;
    const tokens = await publicService.getLiveTokens(subdomain as string);
    res.status(200).json({ success: true, data: tokens });
});
