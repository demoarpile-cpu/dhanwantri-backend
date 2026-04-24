import { login } from './src/services/auth.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        console.log('Testing login with Railway DB...');
        // We don't need real credentials necessarily to see a 500 if it's a DB issue, 
        // but let's try a non-existent one first.
        const result = await login({ email: 'test@example.com', password: 'password' }, '127.0.0.1', 'test-script');
        console.log('Result:', result);
    } catch (error) {
        console.error('Login failed with error:', error);
    }
}

test();
