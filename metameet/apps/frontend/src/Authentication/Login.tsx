import { useState } from 'react';

const BACKEND_URL = 'http://localhost:3000';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!username) {
        throw new Error('Username is required');
      }

      if (!password) {
        throw new Error('Password is required');
      }

      if (isSignUp) {
        const response = await fetch(`${BACKEND_URL}/api/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password,
            type: userType
          })
        });
        
        if (response.ok) {
          setSuccess('Account created successfully! You can now sign in.');
          setTimeout(() => {
            setIsSignUp(false);
            setSuccess('');
          }, 2000);
        } else {
          const data = await response.json();
          throw new Error(data.message || 'Failed to create account');
        }
      } else {
        const response = await fetch(`${BACKEND_URL}/api/v1/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            localStorage.setItem('token', data.token);
            setSuccess('Sign in successful! Redirecting...');
            // In a real app, you would redirect to the main app here
            // window.location.href = '/app';
          }
        } else {
          if (response.status === 403) {
            throw new Error('Invalid username or password');
          } else {
            throw new Error('Something went wrong. Please try again.');
          }
        }
      }
    } catch (err) {
  if (err instanceof Error) {
    setError(err.message);
  } else {
    setError('Something went wrong. Please try again.');
  }
}
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-indigo-600">MetaMeet</h1>
          <p className="mt-2 text-gray-600">Connect and collaborate in virtual spaces</p>
        </div>
        
        <div className="flex justify-center space-x-4 mb-4">
          <button 
            className={`px-4 py-2 font-medium rounded-md ${isSignUp ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setIsSignUp(true)}
          >
            Sign Up
          </button>
          <button 
            className={`px-4 py-2 font-medium rounded-md ${!isSignUp ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setIsSignUp(false)}
          >
            Sign In
          </button>
        </div>
        
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">
            {success}
          </div>
        )}
        
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="username"
              name="username"
              type="email"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="your.email@example.com"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>
          
          {isSignUp && (
            <div>
              <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
                User Type
              </label>
              <select
                id="userType"
                name="userType"
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center text-sm text-gray-600">
          {isSignUp ? (
            <p>Already have an account? <button className="text-indigo-600 hover:text-indigo-800" onClick={() => setIsSignUp(false)}>Sign in</button></p>
          ) : (
            <p>Don't have an account? <button className="text-indigo-600 hover:text-indigo-800" onClick={() => setIsSignUp(true)}>Sign up</button></p>
          )}
        </div>
      </div>
    </div>
  );
}