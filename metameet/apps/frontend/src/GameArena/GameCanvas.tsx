import React, { useEffect, useState, useRef } from 'react';

// Types
interface User {
  id: string;
  userId: string;
  x: number;
  y: number;
}

interface Element {
  elementId: string;
  x: number;
  y: number;
  imageUrl?: string;
  width: number;
  height: number;
  static: boolean;
}

interface SpaceJoinedPayload {
  spawn: {
    x: number;
    y: number;
  };
  users: User[];
  elements?: Element[];
}

interface UserJoinedPayload {
  id: string;
  userId: string;
  x: number;
  y: number;
}

interface UserLeftPayload {
  userId: string;
}

interface MovementPayload {
  userId: string;
  x: number;
  y: number;
}

interface MovementRejectedPayload {
  x: number;
  y: number;
}

interface GameCanvasProps {
  token: string;
  spaceId: string;
  wsUrl?: string;
}

// Constants
const CELL_SIZE = 40;
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-purple-500',
];

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  token, 
  spaceId,
  wsUrl = 'ws://localhost:3001' 
}) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUsers, setOtherUsers] = useState<User[]>([]);
  const [elements, setElements] = useState<Element[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Extract userId from JWT token
  useEffect(() => {
    if (token) {
      try {
        // Extract payload from JWT without verification
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        if (payload.userId) {
          setMyUserId(payload.userId);
        }
      } catch (err) {
        console.error('Error decoding JWT token:', err);
      }
    }
  }, [token]);

  // Connect to WebSocket and handle messages
  useEffect(() => {
    if (!spaceId || !token || !myUserId) return;
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
      
      // Join the space
      socket.send(JSON.stringify({
        type: 'join',
        payload: {
          spaceId,
          token
        }
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);

        switch (message.type) {
          case 'space-joined':
            handleSpaceJoined(message.payload);
            break;
          
          case 'user-joined':
            handleUserJoined(message.payload);
            break;
          
          case 'user-left':
            handleUserLeft(message.payload);
            break;
          
          case 'movement':
            handleUserMovement(message.payload);
            break;
          
          case 'movement-rejected':
            handleMovementRejected(message.payload);
            break;
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    };

    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('Connection error');
      setConnected(false);
    };

    socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setConnected(false);
      setError(`Disconnected: ${event.reason || 'Connection closed'}`);
    };

    setWs(socket);

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [spaceId, token, wsUrl, myUserId]);

  // Handle space joined event
  const handleSpaceJoined = (payload: SpaceJoinedPayload) => {
    const { spawn, users, elements: spaceElements } = payload;
    
    // Set current user position from the spawn point
    setCurrentUser({
      id: 'me',
      userId: myUserId || 'me',
      x: spawn.x,
      y: spawn.y,
    });
    
    // Filter out current user from other users
    if (users && users.length > 0 && myUserId) {
      setOtherUsers(users.filter(user => user.userId !== myUserId));
    }
    
    // Set elements if provided
    if (spaceElements && spaceElements.length > 0) {
      setElements(spaceElements);
    }
  };

  // Handle user joined event
  const handleUserJoined = (payload: UserJoinedPayload) => {
    const { id, userId, x, y } = payload;
    
    // Ignore if this is our own join event
    if (myUserId === userId) {
      return;
    }
    
    setOtherUsers(prevUsers => {
      // Check if user already exists by userId
      const existingUserIndex = prevUsers.findIndex(user => user.userId === userId);
      
      if (existingUserIndex >= 0) {
        // Update existing user
        const updatedUsers = [...prevUsers];
        updatedUsers[existingUserIndex] = { id, userId, x, y };
        return updatedUsers;
      } else {
        // Add new user
        return [...prevUsers, { id, userId, x, y }];
      }
    });
  };

  // Handle user left event
  const handleUserLeft = (payload: UserLeftPayload) => {
    const { userId } = payload;
    
    setOtherUsers(prevUsers => 
      prevUsers.filter(user => user.userId !== userId)
    );
  };

  // Handle user movement event (other users)
  const handleUserMovement = (payload: MovementPayload) => {
    const { userId, x, y } = payload;
    
    // Ignore movement updates for our own user
    if (myUserId === userId) {
      return;
    }
    
    setOtherUsers(prevUsers => 
      prevUsers.map(user => 
        user.userId === userId ? { ...user, x, y } : user
      )
    );
  };

  // Handle movement rejected event
  const handleMovementRejected = (payload: MovementRejectedPayload) => {
    const { x, y } = payload;
    
    // Reset current user position to the server position
    setCurrentUser(prevUser => 
      prevUser ? { ...prevUser, x, y } : null
    );
  };

  // Handle key press for movement
  useEffect(() => {
    if (!connected || !currentUser) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentUser) return;
      
      let newX = currentUser.x;
      let newY = currentUser.y;

      switch (e.key) {
        case 'ArrowUp':
          newY = currentUser.y - 1;
          break;
        case 'ArrowDown':
          newY = currentUser.y + 1;
          break;
        case 'ArrowLeft':
          newX = currentUser.x - 1;
          break;
        case 'ArrowRight':
          newX = currentUser.x + 1;
          break;
        default:
          return;
      }

      // Optimistically update the local position
      setCurrentUser(prev => prev ? { ...prev, x: newX, y: newY } : null);
      
      // Send movement to the server
      ws?.send(JSON.stringify({
        type: 'move',
        payload: {
          x: newX,
          y: newY
        }
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [connected, currentUser, ws]);

  // Get color based on userId
  const getUserColor = (userId: string) => {
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  // Render game UI
  return (
    <div className="w-screen h-screen flex flex-col">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-gray-100 p-2 rounded mb-2">
        <p className="text-sm">Status: {connected ? 'Connected' : 'Disconnected'}</p>
        <p className="text-sm">Use arrow keys to move</p>
        {myUserId && <p className="text-sm">Your ID: {myUserId}</p>}
      </div>

      <div 
        ref={gameContainerRef}
        className="flex-grow relative border border-gray-300 overflow-auto bg-gray-50"
        style={{ height: '600px' }}
      >
        {/* Grid */}
        {Array.from({ length: 20 }, (_, y) => 
          Array.from({ length: 20 }, (_, x) => (
            <div 
              key={`grid-${x}-${y}`}
              className="border border-gray-200"
              style={{
                position: 'absolute',
                left: x * CELL_SIZE,
                top: y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE
              }}
            />
          ))
        )}
        
        {/* Static Elements */}
        {elements.map((element, index) => (
          <div 
            key={`element-${element.elementId}-${index}`}
            className="absolute"
            style={{
              left: element.x * CELL_SIZE,
              top: element.y * CELL_SIZE,
              width: element.width * CELL_SIZE,
              height: element.height * CELL_SIZE,
            }}
          >
            {element.imageUrl ? (
              <img 
                src={element.imageUrl} 
                alt="Element" 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-gray-300"></div>
            )}
          </div>
        ))}
        
        {/* Other Users */}
        {otherUsers.map(user => (
          <div 
            key={`user-${user.userId}`}
            className={`absolute rounded-full flex items-center justify-center text-white font-bold ${getUserColor(user.userId)}`}
            style={{
              left: user.x * CELL_SIZE,
              top: user.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              transition: 'left 0.3s, top 0.3s',
              zIndex: 10
            }}
          >
            {user.userId.substring(0, 1).toUpperCase()}
            <span className="absolute -bottom-6 text-xs text-black whitespace-nowrap">
              {user.userId.substring(0, 6)}
            </span>
          </div>
        ))}
        
        {/* Current User */}
        {currentUser && (
          <div 
            className="absolute rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white font-bold shadow-lg"
            style={{
              left: currentUser.x * CELL_SIZE,
              top: currentUser.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              transition: 'left 0.3s, top 0.3s',
              zIndex: 20
            }}
          >
            ME
            <span className="absolute -bottom-6 text-xs text-black whitespace-nowrap">
              {myUserId?.substring(0, 6) || 'me'}
            </span>
          </div>
        )}
      </div>

      {/* Player count */}
      <div className="mt-2 p-2 bg-gray-100 rounded">
        <p>Players Online: {otherUsers.length + (currentUser ? 1 : 0)}</p>
        {otherUsers.length > 0 && (
          <div className="mt-1 text-xs">
            <p>Other players: {otherUsers.map(u => u.userId.substring(0, 6)).join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameCanvas;