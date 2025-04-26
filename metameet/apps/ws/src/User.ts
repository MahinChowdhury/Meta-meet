import { WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import { OutgoingMessage } from "./types";
import client from "@repo/db";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";

function getRandomString(length: number) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export class User {
    public id: string;
    public userId: string;
    private spaceId?: string;
    private x: number;
    private y: number;
    private ws: WebSocket;

    constructor(ws: WebSocket) {
        this.id = getRandomString(10);
        this.userId = ""; // Will be set when joining
        this.x = 0;
        this.y = 0;
        this.ws = ws;
        this.initHandlers();
    }

    initHandlers() {
        this.ws.on("message", async (data) => {
            try {
                const parsedData = JSON.parse(data.toString());
                console.log("Received message:", parsedData);
                
                switch (parsedData.type) {
                    case "join":
                        const spaceId = parsedData.payload.spaceId;
                        const token = parsedData.payload.token;
                        
                        try {
                            const payload = jwt.verify(token, JWT_PASSWORD) as JwtPayload;
                            const userId = payload.userId;
                            
                            if (!userId) {
                                console.log("Invalid token: missing userId");
                                this.ws.close();
                                return;
                            }
                            
                            console.log("User authenticated:", userId);
                            this.userId = userId;
                            
                            // Check if user already exists in room
                            const existingUser = RoomManager.getInstance().getUserByUserId(spaceId, userId);
                            if (existingUser) {
                                console.log(`User ${userId} already in space, removing old connection`);
                                // Remove old connection
                                RoomManager.getInstance().removeUser(existingUser, spaceId);
                            }
                            
                            const space = await client.space.findFirst({
                                where: {
                                    id: spaceId
                                }
                            });
                            
                            if (!space) {
                                console.log("Space not found:", spaceId);
                                this.ws.close();
                                return;
                            }
                            
                            this.spaceId = spaceId;
                            
                            // Set random spawn position
                            this.x = Math.floor(Math.random() * space.width);
                            this.y = Math.floor(Math.random() * space.height);
                            
                            // Add user to room after setting position
                            RoomManager.getInstance().addUser(spaceId, this);
                            
                            // Send join confirmation to the user
                            const otherUsers = RoomManager.getInstance().rooms.get(spaceId)?.filter(u => u.id !== this.id) || [];
                            
                            this.send({
                                type: "space-joined",
                                payload: {
                                    spawn: {
                                        x: this.x,
                                        y: this.y
                                    },
                                    users: otherUsers.map(u => ({
                                        id: u.id,
                                        userId: u.userId,
                                        x: u.x,
                                        y: u.y
                                    }))
                                }
                            });
                            
                            // Notify other users about this user joining
                            RoomManager.getInstance().broadcast({
                                type: "user-joined",
                                payload: {
                                    id: this.id,
                                    userId: this.userId,
                                    x: this.x,
                                    y: this.y
                                }
                            }, this, this.spaceId!);
                        } catch (err) {
                            console.error("Token verification failed:", err);
                            this.ws.close();
                        }
                        break;
                        
                    case "move":
                        if (!this.spaceId) {
                            console.log("Move rejected: User not in a space");
                            return;
                        }
                        
                        const moveX = parsedData.payload.x;
                        const moveY = parsedData.payload.y;
                        const xDisplacement = Math.abs(this.x - moveX);
                        const yDisplacement = Math.abs(this.y - moveY);
                        
                        if ((xDisplacement == 1 && yDisplacement == 0) || (xDisplacement == 0 && yDisplacement == 1)) {
                            this.x = moveX;
                            this.y = moveY;
                            
                            RoomManager.getInstance().broadcast({
                                type: "movement",
                                payload: {
                                    userId: this.userId,
                                    x: this.x,
                                    y: this.y
                                }
                            }, this, this.spaceId);
                        } else {
                            this.send({
                                type: "movement-rejected",
                                payload: {
                                    x: this.x,
                                    y: this.y
                                }
                            });
                        }
                        break;
                }
            } catch (err) {
                console.error("Error processing message:", err);
            }
        });
        
        this.ws.on("close", () => {
            console.log(`User ${this.userId} (${this.id}) disconnected`);
            this.destroy();
        });
        
        this.ws.on("error", (err) => {
            console.error(`WebSocket error for user ${this.userId}:`, err);
            this.destroy();
        });
    }

    destroy() {
        if (this.spaceId) {
            RoomManager.getInstance().broadcast({
                type: "user-left",
                payload: {
                    userId: this.userId
                }
            }, this, this.spaceId);
            
            RoomManager.getInstance().removeUser(this, this.spaceId);
        }
    }

    send(payload: OutgoingMessage) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        }
    }
    
    // Getter methods to allow RoomManager to access user properties
    getX() {
        return this.x;
    }
    
    getY() {
        return this.y;
    }
}