const axios = require('axios');

function sum(a,b){
    return a+b;
}

test('adds 1 + 2 to equal 3',() => {
    let ans = sum(1,2);
    expect(ans).toBe(3);
});

const BACKEND_URL = "https://localhost:3000";
const WS_URL = "ws://localhost:3001";

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
            username : username + "-user",
            password,
            type : "user"
        })
        userId = userSignupResponse.data.userId;
        const userResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username : username + "-user",
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
    },{
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

describe("Arena information",() => {
    let mapId;
    let element1Id;
    let element2Id;
    let userId;
    let userToken;
    let adminId;
    let adminToken;
    let spaceId;

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
            username : username + "-user",
            password,
            type : "user"
        })
        userId = userSignupResponse.data.userId;
        const userResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username : username + "-user",
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

        const space = await axios.post(`${BACKEND_URL}/api/v1/`,{
            name : "Test",
            dimension : "100x200",
            mapId 
        },{
            header : {
                autherization : `Bearer ${userToken}`
            }
        });

        spaceId = space.spaceId;
    })

    test("Incorrect spaceId",async () => {
        const response = await axios.get(`${BACKEND_URL}/api/v1/space/123klsdfg`,{
            header : {
                autherization : `Bearer ${userToken}`
            }
        });
        expect(response.statusCode).toBe(400);
    })

    test("Correct spaceId returns all the elements",async () => {
        const response = await axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`,{
            header : {
                autherization : `Bearer ${userToken}`
            }
        });   
        expect(response.data.dimension).toBe("100x200");
        expect(response.data.elements.length).toBe(3);
    })

    test("Delete endpoint is able to delete an element",async () => {
        const response = axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`,{
            header : {
                autherization : `Bearer ${userToken}`
            }
        });
        await axios.delete(`${BACKEND_URL}/api/v1/space/element`,{
            spaceId,
            elementId : response.data.elements[0].id
        },{
            header : {
                autherization : `Bearer ${userToken}`
            }
        });
        const newResponse = axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`,{
            header : {
                autherization : `Bearer ${userToken}`
            }
        });
    
        expect(newResponse.data.elements.length).toBe(2);
    })

    test("Adding an element work as expected",async () => {

        await axios.post(`${BACKEND_URL}/api/v1/space/element`,{
            spaceId,
            elementId,
            x : 50,
            y : 20
        },{
            header : {
                autherization : `Bearer ${userToken}`
            }
        });
     
        const newResponse = axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`,{
            header : {
                autherization : `Bearer ${userToken}`
            }
        });
    
        expect(newResponse.data.elements.length).toBe(3);
    })

    test("Adding element fails if lies outside the dimension",async () => {

        const response = await axios.post(`${BACKEND_URL}/api/v1/space/element`,{
            spaceId,
            elementId,
            x : 1000,
            y : 210000
        },{
            header : {
                autherization : `Bearer ${userToken}`
            }
        });
    
        expect(response.statusCode).toBe(400);
    })
})

describe("Create information",() => {
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
            username : username + "-user",
            password,
            type : "user"
        })
        userId = userSignupResponse.data.userId;
        const userResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username : username + "-user",
            password
        })

        userToken = userResponse.data.token;
    })
})

describe("Websocket tests",() => {
    
    let adminToken;
    let adminId;
    let userToken;
    let userId;
    let mapId;
    let element1Id;
    let element2Id;
    let spaceId;
    let ws1;
    let ws2;
    let ws1Messages = []
    let ws2Messages = []

    let userX;
    let userY;
    let adminX;
    let adminY;

    async function waitForAndPopLatestMessage(messagesArray){
        return new Promise(r => {
            if(messagesArray.length > 0){
                resolve(messagesArray.shift())
            }
            else{
                let interval = setInterval(() => {
                    if(messagesArray.length > 0){
                        resolve(messagesArray.shift())
                        clearInterval(interval)
                    }
                },100)
            }
        })
    }

    async function setupHTTP(){
        const username = 'mahin' + Math.random();
        const password = "123456";
        const adminSignupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username,
            password,
            role : "admin"
        })

        const adminSigninRespone = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username,
            password
        })

        adminId = adminSigninRespone.data.userId;
        adminToken = adminSigninRespone.data.token;

        const userSignupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`,{
            username : username + "-user",
            password,
            role : "user"
        })

        const userSigninRespone = await axios.post(`${BACKEND_URL}/api/v1/signin`,{
            username,
            password
        })

        userId = userSigninRespone.data.userId;
        userToken = userSigninRespone.data.token;

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

        const space = await axios.post(`${BACKEND_URL}/api/v1/`,{
            name : "Test",
            dimension : "100x200",
            mapId 
        },{
            header : {
                autherization : `Bearer ${userToken}`
            }
        });

        spaceId = space.spaceId;
    }

    async function setupWs(){
        ws1 = new WebSocket(WS_URL);
        await new Promise(r => {
            ws1.onopen = r
        })

        ws1.onmessage = (event) => {
            ws1Messages.push(JSON.parse(event.data))
        }

        ws2 = new WebSocket(WS_URL);
        await new Promise(r => {
            ws2.onopen = r
        })

        ws2.onmessage = (event) => {
            ws2Messages.push(JSON.parse(event.data))
        }
    }
    
    beforeAll(async () => {
        setupHTTP();
        setupWs();

    })

    test("Get back for ack for joining the space",async () => {
        ws1.send(JSON.stringify({
            "type" : "join",
            "payload" : {
                "spaceid":spaceId,
                "token":adminToken,
                
            }
        }))
        const message1 = await waitForAndPopLatestMessage(ws1Messages);

        ws2.send(JSON.stringify({
            "type" : "join",
            "payload" : {
                "spaceid":spaceId,
                "token":userToken,
                
            }
        }))

        
        const message2 = await waitForAndPopLatestMessage(ws2Messages);
        const message3 = await waitForAndPopLatestMessage(ws1Messages);

        expect(message1.type).toBe("space-joined");
        expect(message2.type).toBe("space-joined");

        expect(message1.payload.users.length).toBe(0);
        expect(message2.payload.users.length).toBe(1);
        expect(message3.type).toBe("user-join");
        expect(message3.payload.x).toBe(message2.payload.spawn.x);
        expect(message3.payload.y).toBe(message2.payload.spawn.y);
        expect(message3.payload.userId).toBe(userId);

        adminX = message1.payload.spawn.x;
        adminY = message1.payload.spawn.y;

        userX = message2.payload.spawn.x;
        userY = message2.payload.spawn.y;
    })

    test("User should be able to move across the boundary of the wall",async () => {
         ws1.send(JSON.stringify({
            type : "movement",
            payload : {
                x : 1000000,
                y : 10000
            }
         }))

         const message = await waitForAndPopLatestMessage(ws1Messages);
         expect(message.type).toBe("movement-rejected");
         expect(message.payload.adminX).toBe(adminX);
         expect(message.payload.adminY).toBe(adminY); 
    })

    test("User should be able to move two block at the same time",async () => {
        ws1.send(JSON.stringify({
           type : "movement",
           payload : {
               x : adminX+2,
               y : adminY
            }
        }))

        const message = await waitForAndPopLatestMessage(ws1Messages);
        expect(message.type).toBe("movement-rejected");
        expect(message.payload.adminX).toBe(adminX);
        expect(message.payload.adminY).toBe(adminY); 
   })

   test("Correct movement should be broadcasted to all",async () => {
        ws1.send(JSON.stringify({
           type : "movement",
           payload : {
               x : adminX+1,
               y : adminY,
               userId : adminId
            }
        }))

        const message = await waitForAndPopLatestMessage(ws1Messages);
        expect(message.type).toBe("movement");
        expect(message.payload.adminX).toBe(adminX+1);
        expect(message.payload.adminY).toBe(adminY); 
   })

   test("Other users receives a leave event if an user leaves",async () => {
    ws1.close();

    const message = await waitForAndPopLatestMessage(ws2Messages);
    expect(message.type).toBe("user-left");
    expect(message.payload.userId).toBe(adminId);
})    
})