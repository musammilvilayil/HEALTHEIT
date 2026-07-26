// Test script to verify admin login
const fetch = require('node-fetch');

async function testAdminLogin() {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@healthiet.com',
                password: 'adminpassword123'
            })
        });

        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));

        if (data.user) {
            console.log('User role:', data.user.role);
            console.log('Is Admin:', data.user.isAdmin);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testAdminLogin();
