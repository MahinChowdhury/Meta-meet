const axios = require('axios');

function sum(a,b){
    return a+b;
}

test('adds 1 + 2 to equal 3',() => {
    let ans = sum(1,2);
    expect(ans).toBe(3);
});

const BACKEND_URL = "https://localhost:3000";

describe("Authentication",() => {
    test('User is able to sign up only once', async () => {
        const username = 'mahin' + Math.random();
        const password = "123456";

        const response = await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username,
            password,
            type:"admin"
        });

        expect(response.statusCode).toBe(200);

        const updatedResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username,
            password,
            type:"admin"
        });

        expect(updatedResponse.statusCode).toBe(400);

    });
    
    test('Signup request fails if the username if empty', async () => {
        const username = 'mahin' + Math.random();
        const password = "123456";

        const response = await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            password
        })

        expect(response.statusCode).toBe(400);

    });

    test('Signing succeeds if the username and password are correct',async () => {
        const username = 'mahin' + Math.random();
        const password = "123456";
        
        await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username,
            password
        });

        const response = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username,
            password
        });

        expect(response.statusCode).toBe(200);

        expect(response.body.token).toBeDefined();

    });

    test('Signing fails if username and password is incorrect', async () => {
        const username = 'mahin' + Math.random();
        const password = "123456";

        await axios.post(`${BACKEND_URL}/api/v1/signup`);
        const response = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username : "wrongUsername",
            password
        })

        expect(response.statusCode).toBe(403);
    });
});
