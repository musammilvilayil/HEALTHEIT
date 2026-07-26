// Test API endpoints
async function testLogin() {
    console.log('Testing login...');
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
        console.log('Login response:', data);
        
        if (data.token) {
            console.log('Login successful, testing users endpoint...');
            
            // Test users endpoint
            const usersResponse = await fetch('http://localhost:5000/api/users', {
                headers: {
                    'Authorization': 'Bearer ' + data.token
                }
            });
            
            const usersData = await usersResponse.json();
            console.log('Users response:', usersData);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testLogin();
