import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface MapOption {
  id: string;
  name: string;
  thumbnail: string;
  dimensions: string;
}

interface CreateSpaceForm {
  name: string;
  dimensions: string;
  mapId: string | null;
}

const BACKEND_URL = 'http://localhost:3000';

const SpaceCreation: React.FC = () => {
  const [availableMaps, setAvailableMaps] = useState<MapOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateSpaceForm>({
    name: '',
    dimensions: '100x100', // Default size
    mapId: null
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${BACKEND_URL}/api/v1/admin/map/all`, {
          headers: {
            authorization: `Bearer ${token}`
          }
        });
        setAvailableMaps(response.data.maps);
      } catch (err) {
        setError('Failed to fetch available maps');
      } finally {
        setLoading(false);
      }
    };

    fetchMaps();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMapSelection = (mapId: string | null) => {
    if (mapId) {
      const selectedMap = availableMaps.find(map => map.id === mapId);
      setFormData(prev => ({
        ...prev,
        mapId,
        dimensions: selectedMap?.dimensions || prev.dimensions
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        mapId: null
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: formData.name,
        dimensions: formData.dimensions,
        ...(formData.mapId && { mapId: formData.mapId })
      };
      
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/space`, 
        payload,
        {
          headers: {
            authorization: `Bearer ${token}`
          }
        }
      );
      
      // Navigate to the space editor with the new space ID
      navigate(`/space/${response.data.spaceId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create space');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading available maps...</div>;
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-6 bg-gray-100">
       <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md w-full max-w-md">
      <h1 className="text-2xl font-bold mb-6">Create New Space</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Space Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="dimensions">
            Dimensions (width x height)
          </label>
          <input
            type="text"
            id="dimensions"
            name="dimensions"
            value={formData.dimensions}
            onChange={handleChange}
            pattern="\d+x\d+"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
          <p className="text-gray-500 text-xs mt-1">Format: widthxheight (e.g., 100x200)</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Template
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className={`p-4 border rounded-lg cursor-pointer ${formData.mapId === null ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
              onClick={() => handleMapSelection(null)}
            >
              <div className="h-32 bg-gray-200 rounded flex items-center justify-center mb-2">
                <span className="text-gray-500">Empty Space</span>
              </div>
              <div className="font-medium">Empty Space</div>
              <div className="text-sm text-gray-500">Start with a blank canvas</div>
            </div>
            
            {availableMaps.map(map => (
              <div 
                key={map.id}
                className={`p-4 border rounded-lg cursor-pointer ${formData.mapId === map.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                onClick={() => handleMapSelection(map.id)}
              >
                <div className="h-32 bg-cover bg-center rounded mb-2" style={{ backgroundImage: `url(${map.thumbnail})` }}></div>
                <div className="font-medium">{map.name}</div>
                <div className="text-sm text-gray-500">{map.dimensions}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-blue-300"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Space'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/spaces')}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
    </div>
    
  );
};

export default SpaceCreation;