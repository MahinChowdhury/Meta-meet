import type { User } from "./User";
import { OutgoingMessage } from "./types";

export class RoomManager {
    rooms: Map<string, User[]> = new Map();
    static instance: RoomManager;

    private constructor() {
        this.rooms = new Map();
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new RoomManager();
        }
        return this.instance;
    }

    public removeUser(user: User, spaceId: string) {
        if (!this.rooms.has(spaceId)) {
            return;
        }
        const users = this.rooms.get(spaceId)?.filter((u) => u.id !== user.id) || [];
        
        if (users.length === 0) {
            this.rooms.delete(spaceId);
        } else {
            this.rooms.set(spaceId, users);
        }
        
        console.log(`User removed from room ${spaceId}. Current users: ${users.length}`);
    }

    public addUser(spaceId: string, user: User) {
        if (!this.rooms.has(spaceId)) {
            this.rooms.set(spaceId, [user]);
            console.log(`Created new room ${spaceId} with 1 user`);
            return;
        }
        
        // Check if user already exists in the room by id
        const existingUsers = this.rooms.get(spaceId) || [];
        if (!existingUsers.some(u => u.id === user.id)) {
            this.rooms.set(spaceId, [...existingUsers, user]);
            console.log(`Added user to room ${spaceId}. Current users: ${existingUsers.length + 1}`);
        } else {
            console.log(`User already exists in room ${spaceId}`);
        }
    }

    public getUserByUserId(spaceId: string, userId: string): User | undefined {
        return this.rooms.get(spaceId)?.find(user => user.userId === userId);
    }

    public getUserById(spaceId: string, id: string): User | undefined {
        return this.rooms.get(spaceId)?.find(user => user.id === id);
    }

    public broadcast(message: OutgoingMessage, user: User, roomId: string) {
        if (!this.rooms.has(roomId)) {
            return;
        }
        
        const users = this.rooms.get(roomId) || [];
        console.log(`Broadcasting to ${users.length - 1} users in room ${roomId}`);
        
        users.forEach((u) => {
            if (u.id !== user.id) {
                u.send(message);
            }
        });
    }
    
    public getUsersInRoom(roomId: string): User[] {
        return this.rooms.get(roomId) || [];
    }
    
    public getRoomCount(roomId: string): number {
        return this.rooms.get(roomId)?.length || 0;
    }
}