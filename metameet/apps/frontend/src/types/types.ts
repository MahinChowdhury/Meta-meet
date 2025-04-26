export interface User {
    userId: string;
    username: string;
    token: string;
    type: "admin" | "user";
  }
  
  export interface Space {
    id: string;
    name: string;
    dimensions: string;
    createdAt: string;
    mapId?: string;
    userId: string;
  }
  
  export interface Element {
    id: string;
    elementId: string;
    x: number;
    y: number;
    spaceId: string;
    imageUrl: string;
    width: number;
    height: number;
    static: boolean;
  }
  
  export interface SpaceDetails {
    id: string;
    name: string;
    dimensions: string;
    elements: Element[];
    mapId?: string;
  }