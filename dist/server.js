import dotenv from 'dotenv';
// Only load from .env if it exists and we're not explicitly told not to.
// Do NOT delete DATABASE_URL in production!
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ override: true });
}
else {
    dotenv.config(); // Still load any other potential envs
}
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import superRoutes from './routes/super.routes.js';
import receptionRoutes from './routes/reception.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import billingRoutes from './routes/billing.routes.js';
import clinicRoutes from './routes/clinic.routes.js';
import departmentRoutes from './routes/department.routes.js';
import patientRoutes from './routes/patient.routes.js';
import formsRoutes from './routes/forms.routes.js';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import labRoutes from './routes/lab.routes.js';
import documentRoutes from './routes/document.routes.js';
import menuRoutes from './routes/menu.routes.js';
import publicRoutes from './routes/public.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import medicalReportRoutes from './routes/medicalReport.routes.js';
import { startTime } from './utils/system.js';
import { prisma } from './lib/prisma.js';
const app = express();
console.log("🔌 Connecting to Database URL:", process.env.DATABASE_URL); // Debug Log
const PORT = Number(process.env.PORT) || 5000;
/* -------------------- MIDDLEWARES -------------------- */
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable CSP for development to avoid blocking local assets
}));
app.use(compression());
// app.use(
//   cors({
//     origin: true, // Allow all origins during debugging
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: [
//       "Content-Type",
//       "Authorization",
//       "X-Requested-With",
//       "x-clinic-id",
//       "Accept",
//       "X-Auth-Token"
//     ],
//     exposedHeaders: ["set-cookie", "Authorization"]
//   })
// );
const isProd = process.env.NODE_ENV === 'production';
app.use(cors({
    origin: isProd
        ? 'https://ev-clinic.wenbear.online' // 👉 replace with your frontend URL
        : true, // allow all in development
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "x-clinic-id",
        "Accept",
        "X-Auth-Token"
    ],
    exposedHeaders: ["set-cookie", "Authorization"]
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Exclusive Vision HIS API is fully operational 🚀'
    });
});
/* -------------------- STATIC FILES -------------------- */
// Serve static files with CORS headers to allow PDF generation to load images
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
}, express.static('uploads'));
/* -------------------- ROUTES -------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/super', superRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/document-controller', documentRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/medical-reports', medicalReportRoutes);
/* -------------------- HEALTH CHECK -------------------- */
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Exclusive Vision HIS API is fully operational 🚀'
    });
});
/* -------------------- GLOBAL ERROR HANDLER -------------------- */
app.use((err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    console.error(`[GLOBAL ERROR HANDLER] Status: ${statusCode} | Message: ${err.message}`);
    if (statusCode === 500)
        console.error(err);
    res.status(statusCode).json({
        success: false,
        status: err.status || 'error',
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : undefined
    });
});
/* -------------------- SERVER START -------------------- */
const server = app.listen(PORT, () => {
    console.log(`
🚀 EV Clinic HIS Backend (Production Fix)
--------------------------------
Status : RUNNING
Port   : ${PORT}
Env    : ${process.env.NODE_ENV || 'production'}
Started: ${startTime}
DB URL : ${process.env.DATABASE_URL ? 'PRESENT' : 'MISSING!'}
--------------------------------
`);
});
/* -------------------- GRACEFUL SHUTDOWN -------------------- */
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await prisma.$disconnect();
    server.close(() => process.exit(0));
});
process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});
export default app;
