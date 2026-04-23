import fs from 'fs';
fs.writeFileSync('db_test_result.json', JSON.stringify({ message: 'Hello from vanilla node' }, null, 2), 'utf8');
console.log('Success');
