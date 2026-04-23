
import bcrypt from 'bcryptjs';

const hash = '$2b$12$h9RtIHmXdODWeL0MTB5GY.u.jzjvpUxfJ7QFvYi.8fHh5spbOUdra';
const password = 'admin123';

bcrypt.compare(password, hash).then(res => {
    console.log('Matches:', res);
});
