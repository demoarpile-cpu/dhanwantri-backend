import axios from 'axios';

async function testFetch() {
    const LOGIN_URL = 'https://ev-clinic-production.up.railway.app/api/auth/login';
    const TEMPLATES_URL = 'https://ev-clinic-production.up.railway.app/api/doctor/templates';

    try {
        console.log('Logging in as doctor...');
        const loginRes = await axios.post(LOGIN_URL, {
            email: 'doctor@evclinic.com', // Use an existing doctor email if known, or I'll create one
            password: 'password123'
        });

        const token = loginRes.data.data.token;
        const clinicId = loginRes.data.data.user.clinics[0];

        console.log(`Fetched token. ClinicID: ${clinicId}`);

        const templatesRes = await axios.get(TEMPLATES_URL, {
            headers: {
                Authorization: `Bearer ${token}`,
                'x-clinic-id': clinicId.toString()
            }
        });

        console.log('Templates Response:', JSON.stringify(templatesRes.data, null, 2));
    } catch (e: any) {
        console.error('Test failed:', e.response?.data || e.message);
    }
}

// I need to make sure a doctor exists first.
testFetch();
