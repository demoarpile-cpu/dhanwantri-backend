import * as patientService from '../services/patient.service.js';
export const getMyAppointments = async (req, res, next) => {
    try {
        const authReq = req;
        const userId = authReq.user.id;
        const email = authReq.user.email;
        const clinicId = authReq.user.clinicId;
        const appointments = await patientService.getMyAppointments(userId, email, clinicId);
        res.json({ success: true, data: appointments });
    }
    catch (error) {
        next(error);
    }
};
export const cancelAppointment = async (req, res, next) => {
    try {
        const authReq = req;
        const email = authReq.user.email;
        const { appointmentId } = req.params;
        await patientService.cancelAppointment(Number(appointmentId), email);
        res.json({ success: true, message: 'Appointment cancelled successfully' });
    }
    catch (error) {
        next(error);
    }
};
export const getMyMedicalRecords = async (req, res, next) => {
    try {
        const authReq = req;
        const userId = authReq.user.id;
        const email = authReq.user.email;
        const clinicId = authReq.user.clinicId;
        const records = await patientService.getMyMedicalRecords(userId, email, clinicId);
        res.json({ success: true, data: records });
    }
    catch (error) {
        next(error);
    }
};
export const getMyInvoices = async (req, res, next) => {
    try {
        const authReq = req;
        const userId = authReq.user.id;
        const email = authReq.user.email;
        const clinicId = authReq.user.clinicId;
        const invoices = await patientService.getMyInvoices(userId, email, clinicId);
        res.json({ success: true, data: invoices });
    }
    catch (error) {
        next(error);
    }
};
export const getMyActivity = async (req, res, next) => {
    try {
        const authReq = req;
        const userId = authReq.user.id;
        const email = authReq.user.email;
        const clinicId = authReq.user.clinicId;
        const activities = await patientService.getMyActivity(userId, email, clinicId);
        res.json({ success: true, data: activities });
    }
    catch (error) {
        next(error);
    }
};
export const bookAppointment = async (req, res, next) => {
    try {
        const authReq = req;
        const userId = authReq.user.id;
        const email = authReq.user.email;
        const appointment = await patientService.bookAppointment(userId, email, req.body);
        res.json({ success: true, data: appointment });
    }
    catch (error) {
        next(error);
    }
};
export const getClinicDoctors = async (req, res, next) => {
    try {
        const { clinicId } = req.params;
        const doctors = await patientService.getClinicDoctors(Number(clinicId));
        res.json({ success: true, data: doctors });
    }
    catch (error) {
        next(error);
    }
};
export const getClinicBookingDetails = async (req, res, next) => {
    try {
        const { clinicId } = req.params;
        const details = await patientService.getClinicBookingDetails(Number(clinicId));
        res.json({ success: true, data: details });
    }
    catch (error) {
        next(error);
    }
};
export const getMyClinics = async (req, res, next) => {
    try {
        const authReq = req;
        const email = authReq.user.email;
        const clinics = await patientService.getMyClinics(email);
        res.json({ success: true, data: clinics });
    }
    catch (error) {
        next(error);
    }
};
export const getPublicClinics = async (req, res, next) => {
    try {
        const clinics = await patientService.getPublicClinics();
        res.json({ success: true, data: clinics });
    }
    catch (error) {
        next(error);
    }
};
export const publicBookAppointment = async (req, res, next) => {
    try {
        const appointment = await patientService.publicBookAppointment(req.body);
        res.json({ success: true, data: appointment });
    }
    catch (error) {
        next(error);
    }
};
// Self-serve: get documents by auth email (called by patient portal)
export const getMyDocuments = async (req, res, next) => {
    try {
        const authReq = req;
        const email = authReq.user.email;
        const clinicId = authReq.user.clinicId;
        const documents = await patientService.getMyDocuments(email, clinicId);
        res.json({ success: true, data: documents });
    }
    catch (error) {
        next(error);
    }
};
// Patient Document Management
export const uploadPatientDocument = async (req, res, next) => {
    try {
        const authReq = req;
        const clinicId = authReq.clinicId;
        const document = await patientService.uploadPatientDocument(clinicId, req.body);
        res.json({ success: true, data: document });
    }
    catch (error) {
        next(error);
    }
};
export const getPatientDocuments = async (req, res, next) => {
    try {
        const authReq = req;
        const clinicId = authReq.clinicId;
        const { patientId } = req.params;
        const documents = await patientService.getPatientDocuments(clinicId, Number(patientId));
        res.json({ success: true, data: documents });
    }
    catch (error) {
        next(error);
    }
};
export const deletePatientDocument = async (req, res, next) => {
    try {
        const authReq = req;
        const clinicId = authReq.clinicId;
        const userEmail = authReq.user?.email;
        const userRole = authReq.user?.role;
        const { documentId } = req.params;
        const { table } = req.query;
        await patientService.deletePatientDocument(Number(documentId), clinicId, userEmail, userRole, table);
        res.json({ success: true, message: 'Document deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
