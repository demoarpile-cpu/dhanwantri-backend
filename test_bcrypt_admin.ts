import bcrypt from 'bcryptjs';
import fs from 'fs';

async function test() {
    const pass = 'admin123';
    const hash = '$2b$12$hdYRRaAaZzejh8od52Hda.g7o9W5CDYaxqO/3NgAqm.a0bnYbiC5.';
    const match = await bcrypt.compare(pass, hash);
    fs.writeFileSync('bcrypt_check_admin.txt', `Match: ${match}\n`, 'utf8');
}

test();
