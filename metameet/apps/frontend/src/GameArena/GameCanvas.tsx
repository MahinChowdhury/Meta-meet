import React, { useEffect, useState, useRef } from 'react';
import SimplePeer from 'simple-peer';

// Types
interface User {
  id: string;
  userId: string;
  x: number;
  y: number;
}

interface PeerConnection {
  id: string;
  userId: string;
  peer: SimplePeer.Instance;
  stream?: MediaStream;
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

interface WebRTCSignalPayload {
  targetId: string;
  targetUserId: string;
  signal: any;
}

interface InitiateCallPayload {
  targetId: string;
  targetUserId: string;
}

interface EndCallPayload {
  targetId: string;
  targetUserId: string;
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
// Set proximity to 2 cells
const PROXIMITY_DISTANCE = 2;

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
  const [peers, setPeers] = useState<Record<string, PeerConnection>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [videoInitialized, setVideoInitialized] = useState(false);
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);

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

  // Calculate distance between users for visual indication
  const calculateDistance = (user1: User, user2: User) => {
    return Math.sqrt(
      Math.pow(user1.x - user2.x, 2) + 
      Math.pow(user1.y - user2.y, 2)
    );
  };

  // Find nearby users for visual indicator
  const getNearbyUsers = () => {
    if (!currentUser) return [];
    
    // Using the PROXIMITY_DISTANCE constant
    return otherUsers.filter(user => {
      const distance = calculateDistance(currentUser, user);
      return distance <= PROXIMITY_DISTANCE;
    });
  };

  // Update nearby users when current user or other users change
  useEffect(() => {
    if (currentUser) {
      setNearbyUsers(getNearbyUsers());
    }
  }, [currentUser, otherUsers]);

  // Update video panel visibility based on peer connections and nearby users
  const updateVideoPanelVisibility = () => {
    const peerCount = Object.keys(peers).length;
    const hasNearbyUsers = nearbyUsers.length > 0;
    
    setShowVideoPanel(peerCount > 0 || hasNearbyUsers);
    console.log(`Updating video panel visibility: ${peerCount} peers, ${nearbyUsers.length} nearby users`);
  };

  // Update video panel visibility when peers or nearby users change
  useEffect(() => {
    updateVideoPanelVisibility();
  }, [peers, nearbyUsers]);

  // Initialize media stream only when first video call is initiated
  const initializeLocalStream = async () => {
    if (videoInitialized) return localStream;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      setVideoInitialized(true);
      
      // Display local video
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Failed to access camera/microphone. Please check permissions.');
      return null;
    }
  };

  // Cleanup function for media streams
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, [localStream]);

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
            
          case 'initiate-call':
            handleInitiateCall(message.payload);
            break;
            
          case 'end-call':
            handleEndCall(message.payload);
            break;
            
          case 'webrtc-signal':
            handleWebRTCSignal(message.payload);
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
    
    // Close any peer connections with this user
    setPeers(prevPeers => {
      const newPeers = { ...prevPeers };
      Object.keys(newPeers).forEach(key => {
        if (newPeers[key].userId === userId) {
          newPeers[key].peer.destroy();
          delete newPeers[key];
        }
      });
      return newPeers;
    });
    
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

  const setVideoStream = (videoElement: HTMLVideoElement | null, stream: MediaStream | undefined | null) => {
    if (videoElement && stream) {
      videoElement.srcObject = stream;
    }
  };;

  // WebRTC Handlers
  const handleInitiateCall = async (payload: InitiateCallPayload) => {
    const { targetId, targetUserId } = payload;
    
    console.log(`Call initiated with user ${targetUserId}`);
    
    // Check if we already have a peer connection with this target
    if (peers[targetId]) {
      console.log(`Peer connection with ${targetUserId} already exists`);
      return;
    }
    
    // Initialize local media stream if not already done
    let stream = localStream;
    if (!videoInitialized) {
      stream = await initializeLocalStream();
    }

    if (!stream) {
      console.error('Local stream not available for peer connection');
      return;
    }
    
    // Show video panel immediately when call is initiated
    setShowVideoPanel(true);
    
    // Create a new peer connection - Initiator if our userId comes first alphabetically
    const shouldInitiate = Boolean(myUserId && myUserId < targetUserId);
    
    console.log(`Creating peer connection as ${shouldInitiate ? 'initiator' : 'receiver'}`);
    
    const peer = new SimplePeer({
      initiator: shouldInitiate,
      trickle: true,
      stream: stream
    });
    
    // Set up peer event handlers
    peer.on('signal', (data) => {
      // Send signaling data to the target user
      ws?.send(JSON.stringify({
        type: 'webrtc-signal',
        payload: {
          targetId,
          signal: data
        }
      }));
    });
    
    peer.on('stream', (remoteStream) => {
      console.log(`Received stream from ${targetUserId}`);
      // Update peer connection with the received stream
      setPeers(prevPeers => ({
        ...prevPeers,
        [targetId]: {
          ...prevPeers[targetId],
          stream: remoteStream
        }
      }));
    });
    
    peer.on('error', (err) => {
      console.error(`Peer connection error with ${targetUserId}:`, err);
    });
    
    // Add the new peer connection to our state
    setPeers(prevPeers => ({
      ...prevPeers,
      [targetId]: {
        id: targetId,
        userId: targetUserId,
        peer,
        stream: undefined
      }
    }));
  };
  
  const handleEndCall = (payload: EndCallPayload) => {
    const { targetId, targetUserId } = payload;
    
    console.log(`Ending call with user ${targetUserId}`);
    
    // Close the peer connection if it exists
    if (peers[targetId]) {
      peers[targetId].peer.destroy();
      
      // Remove the peer from state
      setPeers(prevPeers => {
        const newPeers = { ...prevPeers };
        delete newPeers[targetId];
        return newPeers;
      });
    }
  };
  
  const handleWebRTCSignal = async (payload: WebRTCSignalPayload) => {
    const { targetId, targetUserId, signal } = payload;
    
    console.log(`Received WebRTC signal from ${targetUserId}`);
    
    // Initialize local media stream if not already done
    let stream = localStream;
    if (!videoInitialized) {
      stream = await initializeLocalStream();
    }
    
    // If we don't have a peer connection with this user yet, create one
    if (!peers[targetId] && stream) {
      console.log(`Creating peer connection with ${targetUserId} in response to signal`);
      
      // Show video panel immediately when receiving a WebRTC signal
      setShowVideoPanel(true);
      
      const peer = new SimplePeer({
        initiator: false,
        trickle: true,
        stream: stream
      });
      
      peer.on('signal', (data) => {
        ws?.send(JSON.stringify({
          type: 'webrtc-signal',
          payload: {
            targetId,
            signal: data
          }
        }));
      });
      
      peer.on('stream', (remoteStream) => {
        console.log(`Received stream from ${targetUserId}`);
        setPeers(prevPeers => ({
          ...prevPeers,
          [targetId]: {
            ...prevPeers[targetId],
            stream: remoteStream
          }
        }));
      });
      
      peer.on('error', (err) => {
        console.error(`Peer connection error with ${targetUserId}:`, err);
      });
      
      setPeers(prevPeers => ({
        ...prevPeers,
        [targetId]: {
          id: targetId,
          userId: targetUserId,
          peer,
          stream: undefined
        }
      }));
      
      // Now signal this peer
      peer.signal(signal);
    } else if (peers[targetId]) {
      // We already have a peer connection, just pass along the signal
      peers[targetId].peer.signal(signal);
    }
  };

  // Toggle audio/video
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };
  
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
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

  // Active peers count
  const activePeersCount = Object.keys(peers).length;

  // Render game UI
  return (
    <div className="w-full h-full flex flex-col">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-gray-100 p-2 rounded mb-2">
        <p className="text-sm">Status: {connected ? 'Connected' : 'Disconnected'}</p>
        <p className="text-sm">Use arrow keys to move</p>
        {myUserId && <p className="text-sm">Your ID: {myUserId}</p>}
        <p className="text-sm">Active video calls: {activePeersCount}</p>
      </div>

      <div className="flex flex-grow">
        {/* Game Area */}
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
          {otherUsers.map(user => {
            const isNearby = nearbyUsers.some(nearUser => nearUser.id === user.id);
            return (
              <div 
                key={`user-${user.userId}`}
                className={`absolute rounded-full flex items-center justify-center text-white font-bold ${getUserColor(user.userId)} ${isNearby ? 'ring-2 ring-yellow-300 ring-offset-2' : ''}`}
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
                  {isNearby && <span className="ml-1 text-green-500">●</span>}
                </span>
              </div>
            );
          })}
          
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
          
          {/* Proximity visualization - UPDATED to 2 cells instead of 3 */}
          {currentUser && (
            <div 
              className="absolute rounded-full border-2 border-yellow-300 border-dashed opacity-30"
              style={{
                left: (currentUser.x * CELL_SIZE) - (2 * CELL_SIZE),
                top: (currentUser.y * CELL_SIZE) - (2 * CELL_SIZE),
                width: 5 * CELL_SIZE,  // Changed from 7 to 5 (2 on each side + center)
                height: 5 * CELL_SIZE, // Changed from 7 to 5 (2 on each side + center)
                transition: 'left 0.3s, top 0.3s',
                zIndex: 5
              }}
            />
          )}
        </div>
        
        {/* Video Call Panel - Modified to ensure it displays correctly */}
        {(showVideoPanel || Object.keys(peers).length > 0) && (
          <div className="ml-4 w-64 flex flex-col">
            {/* Local Video */}
            <div className="mb-2">
              <h3 className="font-bold text-sm mb-1">Your Camera</h3>
              <div className="relative bg-black rounded overflow-hidden" style={{ height: '120px' }}>
                {videoInitialized ? (
                  <video 
                    ref={(video) => {
                      localVideoRef.current = video;
                      if (video && localStream) {
                        video.srcObject = localStream;
                      }
                    }}
                    autoPlay 
                    muted 
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white text-xs">
                    <button 
                      onClick={initializeLocalStream} 
                      className="px-2 py-1 bg-blue-500 rounded text-white"
                    >
                      Enable Camera
                    </button>
                  </div>
                )}
                {videoInitialized && !videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-70 text-white">
                    Camera Off
                  </div>
                )}
              </div>
              {videoInitialized && (
                <div className="flex justify-center mt-2 space-x-2">
                  <button
                    onClick={toggleAudio}
                    className={`px-2 py-1 rounded text-white text-xs ${audioEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                  >
                    {audioEnabled ? 'Mic On' : 'Mic Off'}
                  </button>
                  <button
                    onClick={toggleVideo}
                    className={`px-2 py-1 rounded text-white text-xs ${videoEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                  >
                    {videoEnabled ? 'Camera On' : 'Camera Off'}
                  </button>
                </div>
              )}
            </div>
            
            {/* Remote Videos */}
            <div className="flex-grow overflow-y-auto">
              <h3 className="font-bold text-sm mb-1">Nearby Players ({Object.keys(peers).length})</h3>
              {Object.entries(peers).map(([peerId, peerData]) => (
                <div key={peerId} className="mb-2">
                  <div className="text-xs font-medium mb-1">{peerData.userId.substring(0, 10)}</div>
                  <div className="bg-black rounded overflow-hidden relative" style={{ height: '120px' }}>
                    {peerData.stream ? (
                      <video
                        key={`video-${peerId}`}
                        ref={(video) => setVideoStream(video, peerData.stream)}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white text-xs">
                        Connecting...
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {Object.keys(peers).length === 0 && nearbyUsers.length > 0 && !videoInitialized && (
                <div className="text-blue-600 text-sm">
                  <button 
                    onClick={initializeLocalStream}
                    className="px-3 py-1 bg-blue-500 rounded text-white text-sm mt-2"
                  >
                    Start video chat with nearby players
                  </button>
                </div>
              )}
              {Object.keys(peers).length === 0 && nearbyUsers.length === 0 && (
                <div className="text-gray-500 text-sm italic">
                  No players nearby. Move closer to someone to start a call.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Player info and nearby users indicator */}
      <div className="mt-2 p-2 bg-gray-100 rounded">
        <p>Players Online: {otherUsers.length + (currentUser ? 1 : 0)}</p>
        {nearbyUsers.length > 0 && (
          <div className="text-green-600 mt-1">
            <p>Nearby players ({nearbyUsers.length}): {nearbyUsers.map(u => u.userId.substring(0, 6)).join(', ')}</p>
          </div>
        )}
        {!showVideoPanel && nearbyUsers.length > 0 && (
          <button 
            onClick={() => {
              setShowVideoPanel(true);
              initializeLocalStream();
            }}
            className="text-sm text-white bg-blue-600 px-3 py-1 rounded mt-1"
          >
            Start video chat with nearby players
          </button>
        )}
      </div>
    </div>
  );
};

export default GameCanvas;