import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
const getClientInfo = (req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const rawDevice = req.headers['user-agent'] || 'unknown';
    const device = rawDevice.length > 150 ? rawDevice.substring(0, 150) + '...' : rawDevice;
    return { ip: Array.isArray(ip) ? ip[0] : ip, device };
};
export const login = asyncHandler(async (req, res) => {
    const { ip, device } = getClientInfo(req);
    console.log(`[LOGIN CONTROLLER] Body:`, JSON.stringify(req.body));
    try {
        const result = await authService.login(req.body, ip, device);
        console.log('Login backend result successful');
        res.status(200).json({
            success: true,
            message: result?.otpRequired ? 'Verification code sent to email' : 'Login successful',
            data: result
        });
    }
    catch (error) {
        console.error(`[LOGIN CONTROLLER ERROR]`, error);
        throw error; // Let the global handler take it, but now it's logged
    }
});
export const verifyOTP = asyncHandler(async (req, res) => {
    const { ip, device } = getClientInfo(req);
    const result = await authService.verifyOTP(req.body, ip, device);
    res.status(200).json({
        success: true,
        message: 'Verification successful',
        data: result
    });
});
export const getMyClinics = asyncHandler(async (req, res) => {
    const clinics = await authService.getMyClinics(req.user.id);
    res.status(200).json({
        success: true,
        data: clinics
    });
});
export const selectClinic = asyncHandler(async (req, res) => {
    const { ip, device } = getClientInfo(req);
    const { clinicId, role } = req.body;
    const result = await authService.selectClinic(req.user.id, clinicId, role, ip, device);
    res.status(200).json({
        success: true,
        message: 'Clinic context locked',
        data: result
    });
});
export const forgotPassword = asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json({
        success: true,
        message: result.message
    });
});
export const resetPassword = asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body);
    res.status(200).json({
        success: true,
        message: result.message
    });
});
export const changePassword = asyncHandler(async (req, res) => {
    const result = await authService.changePassword(req.user.id, req.body);
    res.status(200).json({
        success: true,
        message: result.message
    });
});
export const refreshToken = asyncHandler(async (req, res) => {
    const result = await authService.refreshToken(req.user.id);
    res.status(200).json({
        success: true,
        data: result
    });
});
export const impersonate = asyncHandler(async (req, res) => {
    const { ip, device } = getClientInfo(req);
    const result = await authService.impersonate(req.user.id, req.body.userId, ip, device);
    res.status(200).json({
        success: true,
        message: 'Impersonation successful',
        data: result
    });
});
