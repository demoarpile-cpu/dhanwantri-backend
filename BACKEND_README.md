# Exclusive Vision (EV) HIS Backend - Documentation

## 🚀 Overview
Industrial-grade backend for the EV Clinic HIS, built with Node.js, Express, TypeScript, Prisma, and MySQL. Implements logical multi-tenancy, strict RBAC, and production-standard security.

---

## 🛠️ Tech Stack
*   **Runtime**: Node.js v18+
*   **Framework**: Express.js with TypeScript
*   **ORM**: Prisma
*   **Database**: MySQL
*   **Auth**: JWT (Stateless) with RS256 equivalent logic.
*   **Validation**: Zod (Schema-based)

---

## 📁 Architecture (Enterprise Grade)
```text
src/
├── controllers/    # Request handling & Response formatting
├── services/       # Core business logic & DB operations
├── routes/         # Endpoint definitions
├── middlewares/    # Auth, RBAC, Validation gates
├── validations/    # Zod schemas for every payload
├── utils/          # Global helpers (AppError, AsyncHandler)
└── prisma/         # Database schema & client
```

---

## 🔑 Environment Variables (.env)
```env
PORT=5000
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/ev_clinic_db"
JWT_SECRET="your_highly_secure_secret"
NODE_ENV=development
```

---

## 🔄 Dummy API → Real API Mapping

| Module | Purpose | Dummy Frontend Action | Backend Endpoint | Method |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | Login | `findUserByCredentials()` | `/api/auth/login` | `POST` |
| **Auth** | Tenure | `getUserClinics()` | `/api/auth/clinics/my` | `GET` |
| **Super** | Clinics | `addClinic()` | `/api/super/clinics` | `POST` |
| **Reception**| Registration | `addPatient()` | `/api/reception/patients` | `POST` |
| **Doctor** | Assessment | `addAssessment()` | `/api/doctor/assessments` | `POST` |
| **Billing** | Invoicing | `addInvoice()` | `/api/billing/invoices` | `GET/PATCH`|

---

## ⚙️ Setup & Run
1.  **Install Dependencies**:
    ```bash
    cd backend
    npm install
    ```
2.  **Database Migration**:
    ```bash
    npx prisma migrate dev --name init
    ```
3.  **Start Development Server**:
    ```bash
    npm run dev
    ```
4.  **Build for Production**:
    ```bash
    npm run build
    npm start
    ```

---

## 🛡️ Security Features
1.  **Logical Isolation**: Every query is scoped by `clinicId` extracted from the JWT.
2.  **Brute Force Protection**: Failed attempts (3 = CAPTCHA, 5 = 15min Lockout).
3.  **Audit Logs**: Every critical action (Login, Assessment, Billing) is persisted in `AuditLog`.
4.  **Input Sanitization**: Zod validation blocks invalid payloads before they reach logic layers.

---
*Developed by: Senior Backend Architect Team*
