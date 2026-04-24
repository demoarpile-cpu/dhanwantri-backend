import { Request, Response, NextFunction } from 'express';
import * as patientService from '../services/patient.service.js';
// We can use the AuthRequest interface from auth middleware or just cast to any for simplicity in this file
// ensuring we don't need to circle-back import if not strictly necessary, 
// but importing AuthRequest is better practice. 
// For now, let's use 'as any' pattern consistent with other controllers if they exist, or just import AuthRequest.
import { AuthRequest } from '../middlewares/auth.js';

export const getMyAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;
        const email = authReq.user!.email;
        const clinicId = authReq.user!.clinicId;
        const appointments = await patientService.getMyAppointments(userId, email, clinicId);
        res.json({ success: true, data: appointments });
    } catch (error) {
        next(error);
    }
};

export const cancelAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const email = authReq.user!.email;
        const { appointmentId } = req.params;
        await patientService.cancelAppointment(Number(appointmentId), email);
        res.json({ success: true, message: 'Appointment cancelled successfully' });
    } catch (error) {
        next(error);
    }
};

export const getMyMedicalRecords = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;
        const email = authReq.user!.email;
        const clinicId = authReq.user!.clinicId;
        const records = await patientService.getMyMedicalRecords(userId, email, clinicId);
        res.json({ success: true, data: records });
    } catch (error) {
        next(error);
    }
};

export const getMyInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;
        const email = authReq.user!.email;
        const clinicId = authReq.user!.clinicId;
        const invoices = await patientService.getMyInvoices(userId, email, clinicId);
        res.json({ success: true, data: invoices });
    } catch (error) {
        next(error);
    }
};

export const getMyActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;
        const email = authReq.user!.email;
        const clinicId = authReq.user!.clinicId;
        const activities = await patientService.getMyActivity(userId, email, clinicId);
        res.json({ success: true, data: activities });
    } catch (error) {
        next(error);
    }
};

export const bookAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const userId = authReq.user!.id;
        const email = authReq.user!.email;
        const appointment = await patientService.bookAppointment(userId, email, req.body);
        res.json({ success: true, data: appointment });
    } catch (error) {
        next(error);
    }
};


export const getClinicDoctors = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clinicId } = req.params;
        const doctors = await patientService.getClinicDoctors(Number(clinicId));
        res.json({ success: true, data: doctors });
    } catch (error) {
        next(error);
    }
};

export const getClinicBookingDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clinicId } = req.params;
        const details = await patientService.getClinicBookingDetails(Number(clinicId));
        res.json({ success: true, data: details });
    } catch (error) {
        next(error);
    }
};

export const getMyClinics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const email = authReq.user!.email;
        const clinics = await patientService.getMyClinics(email);
        res.json({ success: true, data: clinics });
    } catch (error) {
        next(error);
    }
};

export const getPublicClinics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const clinics = await patientService.getPublicClinics();
        res.json({ success: true, data: clinics });
    } catch (error) {
        next(error);
    }
};

export const publicBookAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appointment = await patientService.publicBookAppointment(req.body);
        res.json({ success: true, data: appointment });
    } catch (error) {
        next(error);
    }
};

// Self-serve: get documents by auth email (called by patient portal)
export const getMyDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const email = authReq.user!.email;
        const clinicId = authReq.user!.clinicId;
        const documents = await patientService.getMyDocuments(email, clinicId);
        res.json({ success: true, data: documents });
    } catch (error) {
        next(error);
    }
};

// Patient Document Management
export const uploadPatientDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const clinicId = authReq.clinicId!;
        const document = await patientService.uploadPatientDocument(clinicId, req.body);
        res.json({ success: true, data: document });
    } catch (error) {
        next(error);
    }
};

export const getPatientDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const clinicId = authReq.clinicId!;
        const { patientId } = req.params;
        const documents = await patientService.getPatientDocuments(clinicId, Number(patientId));
        res.json({ success: true, data: documents });
    } catch (error) {
        next(error);
    }
};

export const deletePatientDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authReq = req as AuthRequest;
        const clinicId = authReq.clinicId;
        const userEmail = authReq.user?.email;
        const userRole = authReq.user?.role;
        const { documentId } = req.params;
        const { table } = req.query;
        await patientService.deletePatientDocument(Number(documentId), clinicId, userEmail, userRole, table as string);
        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        next(error);
    }
};

