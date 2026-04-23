import { spawn } from 'child_process';
import hospital_backend from 'http';
import fs from 'fs';

async function test() {
    const child = spawn('npx', ['tsx', 'src/server.ts'], {
        cwd: 'd:/Desktop/ev_clinic save/final backend ev-clinic',
        shell: true,
        env: { ...process.env, NODE_ENV: 'development' }
    });

    const logStream = fs.createWriteStream('integration_debug.log');
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);

    console.log('Server starting...');
    await new Promise(resolve => setTimeout(resolve, 8000)); // Wait for server to start

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
                fs.writeFileSync('integration_result.json', JSON.stringify({
                    statusCode: res.statusCode,
                    body: body
                }, null, 2), 'utf8');
                console.log('Request finished');
                child.kill();
                resolve();
            });
        });

        req.on('error', (err) => {
            fs.writeFileSync('integration_result.json', JSON.stringify({ error: err.message }, null, 2), 'utf8');
            console.log('Request error');
            child.kill();
            resolve();
        });

        req.write(data);
        req.end();
    });
}

test().then(() => process.exit(0));
