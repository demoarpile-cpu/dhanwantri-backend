import hospital_backend from 'http';
import fs from 'fs';

const data = JSON.stringify({
    email: 'superadmin@ev.com',
    password: 'admin123'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = hospital_backend.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        fs.writeFileSync('login_api_test.json', JSON.stringify({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(body)
        }, null, 2), 'utf8');
        process.exit(0);
    });
});

req.on('error', (err) => {
    fs.writeFileSync('login_api_test.json', JSON.stringify({ error: err.message }, null, 2), 'utf8');
    process.exit(0);
});

req.write(data);
req.end();
