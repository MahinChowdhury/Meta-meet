import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types/types';
import Navbar from '../Components/Navbar';

interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
}

interface UserMetadata {
  userId: string;
  avatarId: string;
}

const BACKEND_URL = 'http://localhost:3000';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [userData, setUserData] = useState<{
    username: string;
    userId: string;
    avatarId: string;
    type: "admin" | "user";
  }>({
    username: '',
    userId: '',
    avatarId: '',
    type: 'user'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Check if user is logged in and fetch user data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    fetchUserData(token);
    fetchAvailableAvatars();
  }, [navigate]);
  
  const fetchUserData = async (token: string) => {
    try {
      setIsLoading(true);
      // Decode JWT to get userId (simple approach, not secure for production)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;
      
      // Get user metadata
      const response = await fetch(`${BACKEND_URL}/api/v1/user/metadata/bulk?ids=[${userId}]`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const data = await response.json();
      
      if (data.avatars && data.avatars.length > 0) {
        const user = data.avatars[0];
        setUserData({
          username: payload.username || '',
          userId: userId,
          avatarId: user.avatarId || '',
          type: payload.type || 'user'
        });
        setSelectedAvatarId(user.avatarId || '');
      } else {
        setUserData({
          username: payload.username || '',
          userId: userId,
          avatarId: '',
          type: payload.type || 'user'
        });
      }
      
      setIsLoading(false);
    } catch (err) {
      setError('Failed to load user data. Please try again.');
      setIsLoading(false);
      console.error(err);
    }
  };
  
  const fetchAvailableAvatars = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/avatars`);
      if (!response.ok) {
        throw new Error('Failed to fetch avatars');
      }
      
      const data = await response.json();
      setAvatars(data.avatars || []);
    } catch (err) {
      console.error('Failed to fetch avatars:', err);
    }
  };
  
  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
  };
  
  const handleUpdateProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to update your profile');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch(`${BACKEND_URL}/api/v1/user/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          avatarId: selectedAvatarId
        })
      });
      
      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('Invalid avatar selected. Please choose a valid avatar.');
        } else if (response.status === 403) {
          throw new Error('You are not authorized to update this profile.');
        } else {
          throw new Error('Failed to update profile. Please try again.');
        }
      }
      
      setUserData({
        ...userData,
        avatarId: selectedAvatarId
      });
      
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      if (err instanceof Error && err.message.includes('authorized')) {
        localStorage.removeItem('token');
        setTimeout(() => navigate('/login'), 2000);
      }
      
      console.error(err);
    }
  };
  
  return (
    <div className="w-screen h-screen overflow-x-hidden bg-gray-50">
        <Navbar />
      {/* Profile Page Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage your personal information and avatar</p>
            </div>
            
            {isLoading ? (
              <div className="px-4 py-5 sm:p-6 flex justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="border-t border-gray-200">
                {error && (
                  <div className="px-4 py-3 bg-red-50 border-l-4 border-red-500 text-red-700 mb-4 mx-4 mt-4 rounded">
                    <p>{error}</p>
                  </div>
                )}
                
                {successMessage && (
                  <div className="px-4 py-3 bg-green-50 border-l-4 border-green-500 text-green-700 mb-4 mx-4 mt-4 rounded">
                    <p>{successMessage}</p>
                  </div>
                )}
                
                <dl>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Username</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {userData.username}
                    </dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">User ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {userData.userId}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Account Type</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        userData.type === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {userData.type === 'admin' ? 'Administrator' : 'Standard User'}
                      </span>
                    </dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Current Avatar</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {userData.avatarId ? (
                        <div className="flex items-center">
                          <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-200 mr-4">
                            <img 
                              src={avatars.find(a => a.id === userData.avatarId)?.imageUrl || '/Icons/default-avatar.png'} 
                              alt="Current avatar" 
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span>{avatars.find(a => a.id === userData.avatarId)?.name || 'Unknown Avatar'}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">No avatar selected</span>
                      )}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Select Avatar</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {avatars.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {avatars.map(avatar => (
                            <div 
                              key={avatar.id} 
                              className={`cursor-pointer border-2 rounded-lg p-2 ${selectedAvatarId === avatar.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                              onClick={() => handleAvatarSelect(avatar.id)}
                            >
                              <div className="h-24 w-full overflow-hidden bg-gray-100 rounded-md mb-2">
                                <img 
                                  src={avatar.imageUrl} 
                                  alt={avatar.name} 
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <p className="text-center font-medium">{avatar.name}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No avatars available</p>
                      )}
                    </dd>
                  </div>
                </dl>
                
                <div className="px-4 py-5 bg-gray-50 text-right sm:px-6 border-t border-gray-200">
                  <button
                    type="button"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={handleUpdateProfile}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}