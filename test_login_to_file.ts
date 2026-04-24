import { login } from './src/services/auth.service.js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function test() {
    const logFile = 'login_debug_to_file.txt';
    fs.writeFileSync(logFile, 'Starting login test...\n');
    try {
        // Try with an email that is likely to exist (e.g. from the count of 32, there should be some)
        // I'll use a dummy data first to see if it even reaches the catch
        fs.appendFileSync(logFile, 'Calling authService.login...\n');
        const result = await login({ email: 'nonexistent@example.com', password: 'password' }, '127.0.0.1', 'test-script');
        fs.appendFileSync(logFile, `Result: ${JSON.stringify(result)}\n`);
    } catch (error: any) {
        fs.appendFileSync(logFile, `Catch block triggered. Error: ${error.message}\nStatus: ${error.statusCode}\nStack: ${error.stack}\n`);
    }
}

test();
