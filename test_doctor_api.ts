import axios from 'axios';

async function testApi() {
    const email = 'doctor@ev-clinic.com';
    const password = 'admin123';

    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post('https://ev-clinic-production.up.railway.app/api/auth/login', { email, password });
        const token = loginRes.data.data.token;
        const user = loginRes.data.data.user;
        const clinicId = user.clinics[0];

        console.log('Logged in. Token acquired. Clinic ID:', clinicId);

        // 2. Fetch Templates
        console.log('Fetching templates...');
        const templatesRes = await axios.get('https://ev-clinic-production.up.railway.app/api/doctor/templates', {
            headers: {
                Authorization: `Bearer ${token}`,
                'x-clinic-id': clinicId.toString()
            }
        });

        console.log('Templates Response:', JSON.stringify(templatesRes.data, null, 2));
    } catch (e: any) {
        console.error('API Test Failed:', e.response?.data || e.message);
    }
}

testApi();
