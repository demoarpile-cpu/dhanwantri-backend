import { spawn } from 'child_process';
import fs from 'fs';

// Use spawning to capture all output
const child = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: 'd:/Desktop/ev_clinic save/final backend ev-clinic',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
});

const logFile = 'server_start_debug.log';
const logStream = fs.createWriteStream(logFile);
child.stdout.pipe(logStream);
child.stderr.pipe(logStream);

console.log('Server process started, waiting 10 seconds for logs...');

setTimeout(() => {
    console.log('Stopping server process and checking logs...');
    child.kill();
    setTimeout(() => {
        const logs = fs.readFileSync(logFile, 'utf8');
        fs.writeFileSync('server_final_result.txt', logs, 'utf8');
        process.exit(0);
    }, 1000);
}, 10000);
