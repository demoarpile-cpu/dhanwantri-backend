# Staff Documents – One-time setup

The 503 error for staff document upload means the `staff_document` table and Prisma client are not set up yet. Do this **once** in the backend folder.

## Steps (run in terminal, not as Administrator)

1. **Open a normal terminal** (PowerShell or CMD) – do **not** run Cursor/terminal as Administrator.

2. **Go to backend folder:**
   ```bash
   cd C:\Users\Administrator\Desktop\EVClinic\backend_deepak_ev
   ```

3. **Regenerate Prisma client** (so `staff_document` model is available):
   ```bash
   npx prisma generate
   ```

4. **Apply migration** (create `staff_document` table in the database):
   ```bash
   npx prisma migrate deploy
   ```
   If that fails (e.g. "migration not found"), try:
   ```bash
   npx prisma db push
   ```

5. **Restart the backend server**  
   Stop the current `npm run dev` (Ctrl+C) and start again:
   ```bash
   npm run dev
   ```

6. Try **Upload Documents → Staff** again; it should work.

## Using npm scripts

You can also run:
```bash
cd C:\Users\Administrator\Desktop\EVClinic\backend_deepak_ev
npm run prisma:generate
npm run prisma:migrate
```
Then restart the server with `npm run dev`.
