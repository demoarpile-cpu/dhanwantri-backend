import { spawn } from 'child_process';
import hospital_backend from 'http';
import fs from 'fs';

async function test() {
    const child = spawn('npx', ['tsx', 'src/server.ts'], {
        cwd: 'd:/Desktop/ev_clinic save/final backend ev-clinic',
        shell: true,
        env: { ...process.env, NODE_ENV: 'development' }
    });

    child.stdout.on('data', (data) => console.log(`[SERVER]: ${data}`));
    child.stderr.on('data', (data) => console.error(`[SERVER ERROR]: ${data}`));

    console.log('Server starting... waiting 10s');
    await new Promise(resolve => setTimeout(resolve, 10000));

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

    return new Promise((resolve) => {
        const req = hospital_backend.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log('Response status:', res.statusCode);
                console.log('Response body:', body);
                fs.writeFileSync('integration_result.json', JSON.stringify({
                    statusCode: res.statusCode,
                    body: JSON.parse(body)
                }, null, 2), 'utf8');
                child.kill();
                resolve();
            });
        });

        req.on('error', (err) => {
            console.error('Request error:', err.message);
            fs.writeFileSync('integration_result.json', JSON.stringify({ error: err.message }, null, 2), 'utf8');
            child.kill();
            resolve();
        });

        req.write(data);
        req.end();
    });
}

test().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
