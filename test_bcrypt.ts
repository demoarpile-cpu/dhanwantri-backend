import bcrypt from 'bcryptjs';
import fs from 'fs';

async function test() {
    const pass = 'admin123';
    const hash = await bcrypt.hash(pass, 12);
    const match = await bcrypt.compare(pass, hash);
    fs.writeFileSync('bcrypt_test.txt', `Hash: ${hash}\nMatch: ${match}\n`, 'utf8');
}

test();
