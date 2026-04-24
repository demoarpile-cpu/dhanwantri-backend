import fs from 'fs';
fs.writeFileSync('output_test.txt', 'Hello from Node\n', 'utf8');
console.log('Done writing');
