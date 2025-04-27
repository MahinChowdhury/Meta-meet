import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Space {
  id: string;
  name: string;
  dimensions: string;
  createdAt: string;
}

const SpaceList: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/v1/space/all`, {
          headers: {
            authorization: `Bearer ${token}`
          }
        });
        setSpaces(response.data.spaces);
      } catch (err) {
        setError('Failed to fetch spaces');
      } finally {
        setLoading(false);
      }
    };

    fetchSpaces();
  }, []);

  const handleDelete = async (spaceId: string) => {
    if (!window.confirm('Are you sure you want to delete this space?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/v1/space/${spaceId}`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      setSpaces(spaces.filter(space => space.id !== spaceId));
    } catch (err) {
      setError('Failed to delete space');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading spaces...</div>;
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-6 bg-gray-100">
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md w-full max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold mr-10">My Spaces</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {spaces.length === 0 ? (
        <div className="bg-gray-100 p-8 rounded-lg text-center">
          <h2 className="text-xl font-semibold mb-2">You don't have any spaces yet</h2>
          <p className="text-gray-600 mb-4">Create your first space to get started</p>
          <button
            onClick={() => navigate('/space/create')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Create Space
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map(space => (
            <div key={space.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-lg">{space.name}</span>
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{space.name}</h2>
                <p className="text-gray-600 mb-2">Dimensions: {space.dimensions}</p>
                <p className="text-gray-500 text-sm mb-4">
                  Created: {new Date(space.createdAt).toLocaleDateString()}
                </p>
                <div className="flex justify-between">
                  <Link
                    to={`/space/${space.id}`}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/space/${space.id}/view`}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm"
                  >
                    Enter
                  </Link>
                  <button
                    onClick={() => handleDelete(space.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
    
  );
};

export default SpaceList;