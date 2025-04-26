import React from 'react';
import GameCanvas from './GameCanvas';

const MainArena: React.FC = () => {
  // Get token and spaceId from URL params or localStorage
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || localStorage.getItem('token') || '';
  const spaceId = params.get('spaceId') || localStorage.getItem('spaceId') || '';
  
  // WebSocket URL - hardcoded or from a config file
  const wsUrl = 'ws://localhost:3001';
  
  if (!token || !spaceId) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-100">
        <div className="bg-white p-6 rounded shadow-md">
          <h1 className="text-xl font-bold mb-4">Missing Parameters</h1>
          <p>Please provide token and spaceId as URL parameters:</p>
          <code className="block bg-gray-100 p-2 mt-2 rounded">
            ?token=your_token&spaceId=your_space_id
          </code>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-screen h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Virtual Space</h1>
      <div className="h-full">
        <GameCanvas token={token} spaceId={spaceId} wsUrl={wsUrl} />
      </div>
    </div>
  );
};

export default MainArena;