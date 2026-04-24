import bcrypt from 'bcryptjs';

async function test() {
    const pass = 'admin123';
    const hash = await bcrypt.hash(pass, 12);
    console.log('Hash:', hash);
    const match = await bcrypt.compare(pass, hash);
    console.log('Match:', match);
}

test();
