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
    private activeConnections: Set<string> = new Set();
    private proximityCheckInterval: NodeJS.Timeout | null = null;

    constructor(ws: WebSocket) {
        this.id = getRandomString(10);
        this.userId = ""; // Will be set when joining
        this.x = 0;
        this.y = 0;
        this.ws = ws;
        this.initHandlers();
        this.startProximityCheck();
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
                    case "webrtc-signal":
                        if (!this.spaceId) {
                            console.log("Signal rejected: User not in a space");
                            return;
                        }
                        
                        const targetId = parsedData.payload.targetId;
                        const signal = parsedData.payload.signal;
                        
                        const targetUser = RoomManager.getInstance().getUserById(this.spaceId, targetId);
                        if (!targetUser) {
                            console.log("Target user not found");
                            return;
                        }
                        
                        // Forward the WebRTC signaling data
                        targetUser.send({
                            type: "webrtc-signal",
                            payload: {
                                targetId: this.id,
                                targetUserId: this.userId,
                                signal: signal
                            }
                        });
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

    private startProximityCheck() {
        // Check for nearby users every 2 seconds
        this.proximityCheckInterval = setInterval(() => {
            if (!this.spaceId) return;
            
            const proximityMap = RoomManager.getInstance().checkProximity(this.spaceId);
            const nearbyUsers = proximityMap.get(this.id) || [];
            
            // Start connections with new nearby users
            for (const nearbyUserId of nearbyUsers) {
                if (!this.activeConnections.has(nearbyUserId)) {
                    this.initiateConnection(nearbyUserId);
                }
            }
            
            // End connections with users who are no longer nearby
            for (const connectedUserId of this.activeConnections) {
                if (!nearbyUsers.includes(connectedUserId)) {
                    this.endConnection(connectedUserId);
                }
            }
        }, 2000);
    }

    private initiateConnection(targetUserId: string) {
        if (!this.spaceId) return;
        
        const targetUser = RoomManager.getInstance().getUserById(this.spaceId, targetUserId);
        if (!targetUser) return;
        
        console.log(`Initiating connection between ${this.userId} and ${targetUser.userId}`);
        
        // Send initiate-call message to both users
        this.send({
            type: "initiate-call",
            payload: {
                targetId: targetUser.id,
                targetUserId: targetUser.userId
            }
        });
        
        targetUser.send({
            type: "initiate-call",
            payload: {
                targetId: this.id,
                targetUserId: this.userId
            }
        });
        
        this.activeConnections.add(targetUserId);
    }
    
    private endConnection(targetUserId: string) {
        if (!this.spaceId) return;
        
        const targetUser = RoomManager.getInstance().getUserById(this.spaceId, targetUserId);
        if (!targetUser) {
            // If user not found, just remove from active connections
            this.activeConnections.delete(targetUserId);
            return;
        }
        
        console.log(`Ending connection between ${this.userId} and ${targetUser.userId}`);
        
        // Send end-call message to both users
        this.send({
            type: "end-call",
            payload: {
                targetId: targetUser.id,
                targetUserId: targetUser.userId
            }
        });
        
        targetUser.send({
            type: "end-call",
            payload: {
                targetId: this.id,
                targetUserId: this.userId
            }
        });
        
        this.activeConnections.delete(targetUserId);
    }

    destroy() {

        if (this.proximityCheckInterval) {
            clearInterval(this.proximityCheckInterval);
            this.proximityCheckInterval = null;
        }

        for (const connectedUserId of this.activeConnections) {
            this.endConnection(connectedUserId);
        }
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
}