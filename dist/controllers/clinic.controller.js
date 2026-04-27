import * as clinicService from '../services/clinic.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getClinicStats = asyncHandler(async (req, res) => {
    const stats = await clinicService.getClinicStats(req.clinicId);
    res.status(200).json({ success: true, data: stats });
});
export const getClinicData = asyncHandler(async (req, res) => {
    const data = await clinicService.getClinicContext(req.clinicId);
    res.status(200).json({ success: true, data });
});
export const updateClinicData = asyncHandler(async (req, res) => {
    const data = await clinicService.updateClinic(req.clinicId, req.body);
    res.status(200).json({ success: true, message: 'Clinic details updated successfully', data });
});
export const getClinicStaff = asyncHandler(async (req, res) => {
    const staff = await clinicService.getClinicStaff(req.clinicId);
    res.status(200).json({ success: true, data: staff });
});
export const createStaff = asyncHandler(async (req, res) => {
    const staff = await clinicService.addStaff(req.clinicId, req.body);
    res.status(201).json({ success: true, message: 'Staff added successfully', data: staff });
});
export const updateStaff = asyncHandler(async (req, res) => {
    const staff = await clinicService.updateStaff(req.clinicId, Number(req.params.id), req.body);
    res.status(200).json({ success: true, message: 'Staff updated successfully', data: staff });
});
export const deleteStaff = asyncHandler(async (req, res) => {
    // For super admins, clinicId might not match the staff's clinic, but that's okay - they can delete from any clinic
    // For regular admins, clinicId must match the staff's clinic
    const clinicId = req.clinicId || 0; // Use 0 as placeholder for super admins if clinicId is not set
    await clinicService.deleteClinicStaff(clinicId, Number(req.params.id), req.user?.role);
    res.status(200).json({ success: true, message: 'Staff deleted successfully' });
});
export const getActivities = asyncHandler(async (req, res) => {
    const activities = await clinicService.getClinicActivities(req.clinicId);
    res.status(200).json({ success: true, data: activities });
});
export const getFormTemplates = asyncHandler(async (req, res) => {
    const templates = await clinicService.getFormTemplates(req.clinicId);
    res.status(200).json({ success: true, data: templates });
});
export const createFormTemplate = asyncHandler(async (req, res) => {
    const template = await clinicService.createFormTemplate(req.clinicId, req.body);
    res.status(201).json({ success: true, message: 'Template created successfully', data: template });
});
export const deleteFormTemplate = asyncHandler(async (req, res) => {
    await clinicService.deleteFormTemplate(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Template deleted successfully' });
});
export const getBookingConfig = asyncHandler(async (req, res) => {
    const config = await clinicService.getBookingConfig(req.clinicId);
    res.status(200).json({ success: true, data: config });
});
export const getDoctorAvailability = asyncHandler(async (req, res) => {
    const availability = await clinicService.getDoctorAvailability(req.clinicId, Number(req.params.doctorId));
    res.status(200).json({ success: true, data: availability });
});
export const updateBookingConfig = asyncHandler(async (req, res) => {
    const config = await clinicService.updateBookingConfig(req.clinicId, req.body.config);
    res.status(200).json({ success: true, message: 'Booking configuration updated successfully', data: config });
});
export const resetPassword = asyncHandler(async (req, res) => {
    const { password } = req.body;
    await clinicService.resetUserPassword(req.clinicId, Number(req.params.id), password);
    res.status(200).json({ success: true, message: 'Password reset successfully' });
});
export const getClinicServices = asyncHandler(async (req, res) => {
    const services = await clinicService.getClinicServices(req.clinicId);
    res.status(200).json({ success: true, data: services });
});
export const createClinicService = asyncHandler(async (req, res) => {
    const service = await clinicService.createClinicService(req.clinicId, req.body);
    res.status(201).json({ success: true, message: 'Service created successfully', data: service });
});
export const updateClinicService = asyncHandler(async (req, res) => {
    const service = await clinicService.updateClinicService(req.clinicId, Number(req.params.id), req.body);
    res.status(200).json({ success: true, message: 'Service updated successfully', data: service });
});
export const deleteClinicService = asyncHandler(async (req, res) => {
    await clinicService.deleteClinicService(req.clinicId, Number(req.params.id));
    res.status(200).json({ success: true, message: 'Service deleted successfully' });
});
