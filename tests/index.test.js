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

        await axios.post(`${BACKEND_URL}/api/v1/signup` , {
            username,
            password
        });
        const response = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username : "wrongUsername",
            password
        })

        expect(response.statusCode).toBe(403);
    });
});

describe("User metadata endpoints",()=>{
    let token = "";
    let avatarId = "";
    let userId = "";
    beforeAll(async ()=>{
        const username = 'mahin' + Math.random();
        const password = "123456";

        const signupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username,
            password,
            type : "admin"
        })
        userId = signupResponse.data.userId;
        const response = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username,
            password
        })

        token = response.data.token;

        const avatarResponse = await axios.post(`${BACKEND_URL}/api/v1/avatar`,{
            imageUrl:"sgliahsdghshg",
            name: "Timmy"
        })

        avatarId = avatarResponse.data.avatarId;
    })

    test("User can't update their metadata with wrong avatar id",async () => {
        const response = await axios.post(`${BACKEND_URL}/api/v1/user/metadata`,{
            avatarId : "5345345"
        },{
            headers:{
                "autherization" : `Bearer ${token}`
            }
        })
        expect(response.statusCode).toBe(400);
    });

    test("User can update their metadata with right avatar id",async () => {
        const response = await axios.post(`${BACKEND_URL}/api/v1/user/metadata`,{
            avatarId
        },{
            headers:{
                "autherization" : `Bearer ${token}`
            }
        })
        expect(response.statusCode).toBe(200);
    });

    test("User is not able to update their metadata if the auth header is not present",async () => {
        const respose = await axios.post(`${BACKEND_URL}/api/v1/user/metadata`,{
            avatarId
        })

        expect(response.statusCodetoBe(403));
    })

});

describe("User avatar information", () => {
    let avatarId;
    let token;
    let userId;

    beforeAll(async ()=>{
        const username = 'mahin' + Math.random();
        const password = "123456";

        const signupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username,
            password,
            type : "admin"
        })
        userId = signupResponse.data.userId;
        const response = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username,
            password
        })

        token = response.data.token;

        const avatarResponse = await axios.post(`${BACKEND_URL}/api/v1/avatar`,{
            imageUrl:"sgliahsdghshg",
            name: "Timmy"
        })

        avatarId = avatarResponse.data.avatarId;
    })

    test("Get back avatar information for a user",async () => {
        const response = axios.get(`${BACKEND_URL}/api/v1/user/metadata/bulk?ids=[${userId}]`);

        expect(response.data.avatars.length).toBe(1);
        expect(response.data.avatars[0].imageUrl).toBeDefined();

    })

    test("Available avatars lists the recently created avatar",async () => {
        const response = axios.get(`${BACKEND_URL}/api/v1/avatars`);
        expect(response.data.avatars.length).not.toBe(0);
        const currentAvatar = response.data.avatars.find(x => x.id == avatarId);
        expect(currentAvatar).toBeDefined();
    })
})

describe("Space information",() => {
    let mapId;
    let element1Id;
    let element2Id;
    let userId;
    let userToken;
    let adminId;
    let adminToken;

    beforeAll(async () => {
        const username = 'mahin' + Math.random();
        const password = "123456";

        const signupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username,
            password,
            type : "admin"
        })
        adminId = signupResponse.data.userId;
        const response = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username,
            password
        })

        adminToken = response.data.token;

        const userSignupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username,
            password,
            type : "user"
        })
        userId = userSignupResponse.data.userId;
        const userResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username,
            password
        })

        userToken = userResponse.data.token;

        const element1 = await axios.post(`${BACKEND_URL}/api/v1/admin/element`,{
            imageurl : "ghasdpoghiweyv",
            width : 1,
            height : 1,
            static : true
        },{
            headers: {
                autherization : `Bearer ${adminToken}`
            }
        })

        element1Id = element1.id

        const element2 = await axios.post(`${BACKEND_URL}/api/v1/admin/element`,{
            imageurl : "ghasdpoghiweyv",
            width : 1,
            height : 1,
            static : true
        },{
            headers: {
                autherization : `Bearer ${adminToken}`
            }
        })

        element2Id = element2.id

        const map = await axios.post(`${BACKEND_URL}/api/v1/admin/map`,{
            thumbnail : "dgadgas",
            dimension : "100x200",
            defaultElements : [{
                elementId : element1Id,
                x:20,
                y:20
            },{
                elementId : element1Id,
                x:18,
                y:20
            },{
                elementId : element2Id,
                x:19,
                y:20
            }]
        },{
            headers:{
                autherization : `Bearer ${adminToken}`
            }
        })

        mapId = map.id;

    })

    test("User is able to create a space",async () => {
        const response = await axios.post(`${BACKEND_URL}/api/v1/space`,{
            name : "Test",
            dimension : "100x200",
            mapId
        },{
            header : {
                autherization : `Bearer ${userToken}`
            }
        })

        expect(response.spaceId).toBeDefined();
    })

    test("User is able to create a space without mapId",async () => {
        const response = await axios.post(`${BACKEND_URL}/api/v1/space`,{
            name : "Test",
            dimension : "100x200",
        },{
            header : {
                autherization : `Bearer ${userToken}`
            }
        })

        expect(response.spaceId).toBeDefined();
    })

    test("User is not able to create a space without mapId and dimensions",async () => {
        const response = await axios.post(`${BACKEND_URL}/api/v1/space`,{
            name : "Test",
        },{
            header : {
                autherization : `Bearer ${userToken}`
            }
        })

        expect(response.statusCode).toBe(400);
    })

    test("User is not able to delete a space that doesnt exists",async () => {
        const response = await axios.delete(`${BACKEND_URL}/api/v1/space/randomIdDoesntExist`,{
            header : {
                autherization : `Bearer ${userToken}`
            }
        })

        expect(response.statusCode).toBe(400);
    })

    test("User is able to delet a space that does exists",async () => {
        const response = await axios.post(`${BACKEND_URL}/api/v1/space`,{
            name : "Test",
            dimension : "100x200",
        },{
            header : {
                autherization : `Bearer ${userToken}`
            }
        })

        const deleteResponse = await axios.delete(`${BACKEND_URL}/api/v1/space/${response.data.spaceId}`,{
            header : {
                autherization : `Bearer ${userToken}`
            }
        })

        expect(deletResponse.statusCode).toBe(200);
    })

    test("User should not be able to delete a space created by another user",async () => {
        const response = await axios.post(`${BACKEND_URL}/api/v1/space`,{
            name : "Test",
            dimension : "100x200",
        },{
            header : {
                autherization : `Bearer ${userToken}`
            }
        })

        const deleteResponse = await axios.delete(`${BACKEND_URL}/api/v1/space/${response.data.spaceId}`,{
            header : {
                autherization : `Bearer ${adminToken}`
            }
        })

        expect(deleteResponse.statusCode).toBe(400);
    })

    test('Admin has no spaces initially',async () => {
        const response = await axios.get(`${BACKEND_URL}/api/v1/space/all`);
        expect(response.data.spaces.length).toBe(0);
    }{
        header : {
            autherization : `Bearer ${adminToken}`
        }
    })

    test('Admin has no spaces initially',async () => {
        const spaceCreateResponse = await axios.post(`${BACKEND_URL}/api/v1/space/`,{
            name : "Test",
            dimension : "100x200",
        },{
            header : {
                autherization : `Bearer ${adminToken}`
            }
        })
        const response = await axios.get(`${BACKEND_URL}/api/v1/space/all`);
        const filteredSpace = response.data.spaces.find(x=> x.id == spaceCreateResponse.spaceId)
        expect(response.data.spaces.length).toBe(1);
        expect(filteredSpace).toBeDefined();
    })

})
