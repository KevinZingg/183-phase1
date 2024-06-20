const axios = require('axios');

async function simulateLogin(username, password) {
    try {
        const response = await axios.get('http://localhost:3000/login', {
            params: {
                username: username,
                password: password
            }
        });
        console.log(response.data);
    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
    }
}

async function testBruteForceProtection() {
    const username = 'testuser';
    const password = 'wrongpassword';
    for (let i = 0; i < 10; i++) {
        console.log(`Attempt ${i + 1}`);
        await simulateLogin(username, password);
    }
}

testBruteForceProtection();
