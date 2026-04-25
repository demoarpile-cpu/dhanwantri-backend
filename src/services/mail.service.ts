import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';

let cachedSmtpConfig: any = null;
let cachedTransporter: any = null;
let smtpCacheAt = 0;
const SMTP_CACHE_TTL_MS = 5 * 60 * 1000;

const getSmtpConfig = async () => {
    const now = Date.now();
    if (cachedSmtpConfig && now - smtpCacheAt < SMTP_CACHE_TTL_MS) {
        return cachedSmtpConfig;
    }

    const envHost = (process.env.SMTP_HOST || '').trim();
    const envUser = (process.env.SMTP_USER || '').trim();
    const envPass = String(process.env.SMTP_PASS || '').trim();
    const envPort = Number(process.env.SMTP_PORT) || 587;
    const envSecure = String(process.env.SMTP_SECURE || 'false') === 'true';

    // Fast path: env SMTP values available, skip DB read.
    if (envHost && envUser && envPass) {
        cachedSmtpConfig = {
            host: envHost,
            port: envPort,
            secure: envSecure,
            user: envUser,
            pass: envPass
        };
        smtpCacheAt = now;
        return cachedSmtpConfig;
    }

    const settings = await prisma.system_settings.findMany();
    const config = settings.reduce((acc: any, s) => {
        acc[s.key] = s.value;
        return acc;
    }, {});

    cachedSmtpConfig = {
        host: (process.env.SMTP_HOST || config.SMTP_HOST || '').trim(),
        port: Number(process.env.SMTP_PORT || config.SMTP_PORT) || 587,
        secure: String(process.env.SMTP_SECURE || config.SMTP_SECURE || 'false') === 'true',
        user: (process.env.SMTP_USER || config.SMTP_USER || '').trim(),
        pass: String(process.env.SMTP_PASS || config.SMTP_PASS || '').trim()
    };
    smtpCacheAt = now;
    return cachedSmtpConfig;
};

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const smtpConfig = await getSmtpConfig();
        const smtpHost = smtpConfig.host;
        const smtpPort = smtpConfig.port;
        const smtpSecure = smtpConfig.secure;
        const smtpUser = smtpConfig.user;
        const smtpPass = smtpConfig.pass;

        // Dummy mode: if SMTP details are missing, don't send external mail.
        // OTP will still be available through frontend demo display.
        if (!smtpHost || !smtpUser || !smtpPass) {
            console.log('[MAIL] SMTP not configured. Skipping external email send (dummy mode).');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            return { success: false, skipped: true };
        }

        if (!cachedTransporter || cachedTransporter.__smtpKey !== `${smtpHost}:${smtpPort}:${smtpUser}`) {
            cachedTransporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                connectionTimeout: 8000,
                greetingTimeout: 8000,
                socketTimeout: 10000,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                }
            });
            cachedTransporter.__smtpKey = `${smtpHost}:${smtpPort}:${smtpUser}`;
        }

        const transporter = cachedTransporter;

        // For Gmail SMTP, MAIL FROM should match authenticated user to avoid envelope errors.
        const fromAddress = smtpUser
            ? `"Dhanvantri Hospital" <${smtpUser}>`
            : `"Dhanvantri Hospital" <no-reply@dhanvantri.local>`;


        const mailOptions = {
            from: fromAddress,
            to,
            subject,
            html
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${result.messageId}`);
        return result;
    } catch (error) {
        cachedTransporter = null;
        console.error('Email send error:', error);
        // In local development, we might not have valid SMTP, so we log the OTP instead
        console.log('--- FALLBACK: EMAIL NOT SENT but LOGGING CONTENT ---');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${html}`);
        console.log('----------------------------------------------------');
        return { success: false, error };
    }
};

export const sendOTP = async (email: string, otp: string) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #1E1B4B;">Dhanvantri Hospital</h2>
                <p style="color: #64748B;">Healthcare Information System</p>
            </div>
            <div style="background: #F8FAFC; padding: 30px; border-radius: 10px; text-align: center;">
                <p style="font-size: 16px; color: #1E293B;">Your Two-Step Verification Code is:</p>
                <h1 style="font-size: 36px; color: #2D3BAE; letter-spacing: 5px; margin: 20px 0;">${otp}</h1>
                <p style="font-size: 14px; color: #64748B;">This code will expire in 1 minute. Do not share this code with anyone.</p>
            </div>
            <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #94A3B8;">
                <p>© ${new Date().getFullYear()} Dhanvantri Hospital. All rights reserved.</p>
            </div>
        </div>
    `;

    return sendEmail(email, 'Your 2FA OTP Code', html);
};

export const sendCredentialsEmail = async (email: string, name: string, password: string) => {
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173/login';

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #1E1B4B;">Dhanvantri Hospital</h2>
                <p style="color: #64748B;">Welcome to our Patient Portal</p>
            </div>
            <div style="padding: 20px;">
                <p>Dear ${name},</p>
                <p>Your patient account has been successfully created. You can now access your medical records, appointments, and prescriptions online.</p>
                
                <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2D3BAE;">
                    <p style="margin: 5px 0;"><strong>Username:</strong> ${email}</p>
                    <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${password}</p>
                </div>

                <p>For security reasons, please change your password immediately after logging in.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${loginUrl}" style="background-color: #2D3BAE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Portal</a>
                </div>
            </div>
            <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #94A3B8;">
                <p>© ${new Date().getFullYear()} Dhanvantri Hospital. All rights reserved.</p>
            </div>
        </div>
    `;

    return sendEmail(email, 'Your Patient Portal Access', html);
};
