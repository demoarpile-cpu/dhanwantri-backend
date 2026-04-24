
import { login } from './src/services/auth.service.js';
import { prisma } from './src/server.js';

async function testLogin() {
    try {
        const result = await login({
            email: 'd@gmail.com',
            password: 'admin123'
        }, '127.0.0.1', 'test-device');

        console.log('Login Result:');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Login Failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testLogin();
