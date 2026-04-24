export const getMenuByRole = async (role) => {
    const menus = {
        SUPER_ADMIN: [
            { name: 'Overview', path: '/super-admin', icon: 'FiHome' },
            { name: 'Companies', path: '/super-admin/clinics', icon: 'FiGrid' },
            { name: 'Modules', path: '/super-admin/modules', icon: 'FiPackage' },
            { name: 'Admins', path: '/super-admin/admins', icon: 'FiUserPlus' },
            { name: 'Invoices & Plans', path: '/super-admin/invoices', icon: 'FiFileText' },
            { name: 'Audit Logs', path: '/super-admin/audit-logs', icon: 'FiFileText' },
            { name: 'System Settings', path: '/super-admin/settings', icon: 'FiSettings' },
        ],
        ADMIN: [
            { name: 'Dashboard', path: '/clinic-admin', icon: 'FiHome' },
            { name: 'Staff Management', path: '/clinic-admin/staff', icon: 'FiUsers' },
            { name: 'Appointments', path: '/clinic-admin/booking-link', icon: 'FiGrid' },
            { name: 'Patients', path: '/reception/patients', icon: 'FiUsers' },
            { name: 'Billing', path: '/reception/billing', icon: 'FiDollarSign' },
            { name: 'Reports', path: '/accounting/reports', icon: 'FiFileText' },
            { name: 'Forms', path: '/clinic-admin/forms', icon: 'FiFileText' },
            { name: 'Modules', path: '/clinic-admin/modules', icon: 'FiPackage' },
            { name: 'Departments', path: '/clinic-admin/departments', icon: 'FiBriefcase' },
            { name: 'Clinic Services', path: '/clinic-admin/services', icon: 'FiList' },
            { name: 'Audit Logs', path: '/clinic-admin/audit-logs', icon: 'FiFileText' },
            { name: 'Settings', path: '/clinic-admin/settings', icon: 'FiSettings' },
        ],
        DOCTOR: [
            { name: 'Overview', path: '/doctor', icon: 'FiHome' },
            { name: 'Patient History', path: '/doctor/patients', icon: 'FiUsers' },
            { name: 'Consultation', path: '/doctor/assessments', icon: 'FiActivity' },
            { name: 'Lab / Radiology / Prescription', path: '/doctor/orders', icon: 'FiFileText' },
            { name: 'Revenue', path: '/doctor/revenue', icon: 'FiPieChart' },
        ],
        RECEPTIONIST: [
            { name: 'Front Desk', path: '/reception', icon: 'FiHome' },
            { name: 'Calendar', path: '/reception/calendar', icon: 'FiCalendar' },
            { name: 'Appointment Booking', path: '/reception/bookings', icon: 'FiGrid' },
            { name: 'Patient Registration', path: '/reception/patients', icon: 'FiUsers' },
            { name: 'Billing', path: '/reception/billing', icon: 'FiDollarSign' },
        ],
        PHARMACY: [
            { name: 'Dashboard', path: '/pharmacy', icon: 'FiHome' },
            { name: 'Prescriptions', path: '/pharmacy/prescriptions', icon: 'FiFileText' },
            { name: 'Medicine Sale', path: '/pharmacy/medicine-sale', icon: 'FiPackage' },
            { name: 'Inventory', path: '/pharmacy/inventory', icon: 'FiGrid' },
            { name: 'Stock Alert', path: '/pharmacy/stock-alert', icon: 'FiAlertTriangle' },
        ],
        LAB: [
            { name: 'Dashboard', path: '/lab', icon: 'FiHome' },
            { name: 'Lab Test Requests', path: '/lab/requests', icon: 'FiFileText' },
            { name: 'Sample Collection', path: '/lab/sample-collection', icon: 'FiPackage' },
            { name: 'Enter Results', path: '/lab/enter-results', icon: 'FiEdit2' },
            { name: 'Upload Report', path: '/lab/upload-report', icon: 'FiUpload' },
            { name: 'History', path: '/lab/history', icon: 'FiList' },
        ],
        RADIOLOGY: [
            { name: 'Dashboard', path: '/radiology', icon: 'FiHome' },
            { name: 'Scan Requests', path: '/radiology/requests', icon: 'FiFileText' },
            { name: 'Upload Images', path: '/radiology/upload-images', icon: 'FiUpload' },
            { name: 'Upload Report', path: '/radiology/upload-report', icon: 'FiFileText' },
            { name: 'History', path: '/radiology/history', icon: 'FiList' },
        ],
        ACCOUNTANT: [
            { name: 'Dashboard', path: '/accounting', icon: 'FiHome' },
            { name: 'Billing', path: '/accounting/billing', icon: 'FiPieChart' },
            { name: 'Daily / Monthly Report', path: '/accounting/reports', icon: 'FiFileText' },
        ],
        PATIENT: [
            { name: 'Dashboard', path: '/patient', icon: 'FiGrid' },
            { name: 'Book Appointment', path: '/patient/book', icon: 'FiCalendar' },
            { name: 'Appointment Status', path: '/patient/status', icon: 'FiActivity' },
        ],
        DOCUMENT_CONTROLLER: [
            { name: 'Dashboard', path: '/documents', icon: 'FiHome' },
            { name: 'Upload Documents', path: '/documents/upload', icon: 'FiUpload' },
            { name: 'Patient Documents', path: '/documents/patient-documents', icon: 'FiUsers' },
            { name: 'Staff Documents', path: '/documents/staff-documents', icon: 'FiFileText' },
            { name: 'Reports', path: '/documents/reports', icon: 'FiPieChart' },
            { name: 'Archive', path: '/documents/archive', icon: 'FiList' },
        ]
    };
    // Normalize role names
    let normalizedRole = role.toUpperCase();
    if (normalizedRole === 'LABORATORY')
        normalizedRole = 'LAB';
    if (normalizedRole === 'RADIOLOGIST')
        normalizedRole = 'RADIOLOGY';
    if (normalizedRole === 'ACCOUNTING' || normalizedRole === 'ACCOUNTS')
        normalizedRole = 'ACCOUNTANT';
    return menus[normalizedRole] || [];
};
