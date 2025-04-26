import { Space, SpaceDetails } from '../types/types';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const getToken = () => localStorage.getItem('userToken') || '';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
});

const api = {
  // Space APIs
  getAllSpaces: async (): Promise<{ spaces: Space[] }> => {
    const res = await fetch(`${BACKEND_URL}/api/v1/space/all`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch spaces');
    return res.json();
  },

  getSpaceDetails: async (spaceId: string): Promise<SpaceDetails> => {
    const res = await fetch(`${BACKEND_URL}/api/v1/space/${spaceId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch space details');
    return res.json();
  },

  createSpace: async (name: string, dimensions: string, mapId: string | null) => {
    const payload: any = { name, dimensions };
    if (mapId) payload.mapId = mapId;

    const res = await fetch(`${BACKEND_URL}/api/v1/space`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Failed to create space');
    return res.json();
  },

  deleteSpace: async (spaceId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/v1/space/${spaceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error('Failed to delete space');
    return res.json();
  },

  // Element APIs
  addElement: async (elementId: string, spaceId: string, x: number, y: number) => {
    const res = await fetch(`${BACKEND_URL}/api/v1/space/element`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ elementId, spaceId, x, y }),
    });

    if (!res.ok) throw new Error('Failed to add element');
    return res.json();
  },

  deleteElement: async (elementId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/v1/space/element`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id: elementId }),
    });

    if (!res.ok) throw new Error('Failed to delete element');
    return res.json();
  }
};

export default api;
