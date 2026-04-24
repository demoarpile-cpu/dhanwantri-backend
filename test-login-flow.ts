const API_URL = 'http://localhost:3000/api';

async function testLogin(email: string, password: string) {
    try {
        console.log(`\n🔐 Testing login for: ${email}`);

        // Step 1: Login
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const loginData = await loginResponse.json();

        if (!loginData.success) {
            console.error('❌ Login failed:', loginData.message);
            return;
        }

        console.log('✅ Login successful!');
        console.log('   User Role:', loginData.data.user.role);
        console.log('   All Roles:', loginData.data.user.roles);
        console.log('   Clinics:', loginData.data.user.clinics);

        const token = loginData.data.token;

        // Step 2: Get clinics
        const clinicsResponse = await fetch(`${API_URL}/auth/my-clinics`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const clinicsData = await clinicsResponse.json();

        console.log('\n📋 Available Clinics:');
        for (const clinic of clinicsData.data) {
            console.log(`   - ${clinic.name}: Role = ${clinic.role}`);
        }

        // Step 3: Select first clinic
        if (clinicsData.data.length > 0) {
            const firstClinic = clinicsData.data[0];
            console.log(`\n🏥 Selecting clinic: ${firstClinic.name}`);

            const selectResponse = await fetch(`${API_URL}/auth/select-clinic`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ clinicId: firstClinic.id })
            });

            const selectData = await selectResponse.json();

            console.log('✅ Clinic selected!');
            console.log('   New Token Generated');

            // Decode the new token to see the role
            const newToken = selectData.data.token;
            const base64Url = newToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(base64));
            console.log('   Token Role:', payload.role);
            console.log('   Token Clinic ID:', payload.clinicId);
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

async function runTests() {
    console.log('🧪 Starting Role Assignment Tests...\n');
    console.log('='.repeat(60));

    await testLogin('admin@ev-clinic.com', 'admin123');
    console.log('\n' + '='.repeat(60));

    await testLogin('doctor@ev-clinic.com', 'admin123');
    console.log('\n' + '='.repeat(60));

    await testLogin('reception@ev-clinic.com', 'admin123');
    console.log('\n' + '='.repeat(60));

    console.log('\n✅ All tests completed!\n');
}

runTests();
