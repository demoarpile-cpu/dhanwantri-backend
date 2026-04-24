import * as receptionService from '../services/reception.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getPatients = asyncHandler(async (req, res) => {
    const patients = await receptionService.getPatientsByClinic(req.clinicId, req.query.search);
    res.status(200).json({ status: 'success', data: patients });
});
export const createPatient = asyncHandler(async (req, res) => {
    const patient = await receptionService.registerPatient(req.clinicId, req.body);
    res.status(201).json({ status: 'success', data: patient });
});
export const updatePatient = asyncHandler(async (req, res) => {
    const patient = await receptionService.updatePatientDetails(req.clinicId, Number(req.params.id), req.body);
    res.status(200).json({ status: 'success', data: patient });
});
export const getAppointments = asyncHandler(async (req, res) => {
    const patientId = req.query.patientId ? Number(req.query.patientId) : undefined;
    const appointments = await receptionService.getBookings(req.clinicId, req.query.date, patientId);
    res.status(200).json({ status: 'success', data: appointments });
});
export const getPatientAppointments = asyncHandler(async (req, res) => {
    const appointments = await receptionService.getPatientAppointments(req.clinicId, Number(req.params.patientId));
    res.status(200).json({ status: 'success', data: appointments });
});
export const createAppointment = asyncHandler(async (req, res) => {
    const appointment = await receptionService.createBooking(req.clinicId, req.body);
    res.status(201).json({ status: 'success', data: appointment });
});
export const updateApptStatus = asyncHandler(async (req, res) => {
    const appt = await receptionService.updateBookingStatus(req.clinicId, Number(req.params.id), req.body.status);
    res.status(200).json({ status: 'success', data: appt });
});
export const checkIn = asyncHandler(async (req, res) => {
    const appt = await receptionService.checkInPatient(req.clinicId, Number(req.params.id));
    res.status(200).json({ status: 'success', data: appt });
});
export const getStats = asyncHandler(async (req, res) => {
    const stats = await receptionService.getReceptionStats(req.clinicId);
    res.status(200).json({ status: 'success', data: stats });
});
export const getActivities = asyncHandler(async (req, res) => {
    const activities = await receptionService.getReceptionActivities(req.clinicId);
    res.status(200).json({ status: 'success', data: activities });
});
export const resetPassword = asyncHandler(async (req, res) => {
    await receptionService.resetPatientPassword(Number(req.params.id), req.body.password);
    res.status(200).json({ status: 'success', message: 'Password reset successfully' });
});
