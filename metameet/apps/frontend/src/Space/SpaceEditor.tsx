import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Element {
  id: string;
  elementId: string;
  x: number;
  y: number;
  imageUrl: string;
  width: number;
  height: number;
  static: boolean;
}

interface AvailableElement {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  static: boolean;
}

interface Space {
  id: string;
  name: string;
  dimensions: string;
  elements: Element[];
}

const SpaceEditor: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [space, setSpace] = useState<Space | null>(null);
  const [availableElements, setAvailableElements] = useState<AvailableElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<AvailableElement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch space details
        const spaceResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/v1/space/${spaceId}`,
          {
            headers: { authorization: `Bearer ${token}` }
          }
        );
        
        setSpace(spaceResponse.data);
        
        // Parse dimensions
        const [width, height] = spaceResponse.data.dimensions.split('x').map(Number);
        setDimensions({ width, height });
        
        // Fetch available elements
        const elementsResponse = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/v1/admin/element/all`,
          {
            headers: { authorization: `Bearer ${token}` }
          }
        );
        
        setAvailableElements(elementsResponse.data.elements);
      } catch (err) {
        setError('Failed to load space data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [spaceId]);

  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedElement || !canvasRef.current || !space) return;
    
    // Calculate position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / 20); // Assuming 20px per grid unit
    const y = Math.floor((e.clientY - rect.top) / 20);
    
    // Check if position is within bounds
    if (x < 0 || y < 0 || x >= dimensions.width || y >= dimensions.height) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/space/element`,
        {
          elementId: selectedElement.id,
          spaceId,
          x,
          y
        },
        {
          headers: { authorization: `Bearer ${token}` }
        }
      );
      
      // Refresh space data
      const spaceResponse = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/space/${spaceId}`,
        {
          headers: { authorization: `Bearer ${token}` }
        }
      );
      
      setSpace(spaceResponse.data);
    } catch (err) {
      setError('Failed to add element');
    }
  };

  const handleElementDelete = async (elementInstanceId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/space/element`,
        {
          data: { id: elementInstanceId },
          headers: { authorization: `Bearer ${token}` }
        }
      );
      
      // Update space data locally
      if (space) {
        setSpace({
          ...space,
          elements: space.elements.filter(element => element.id !== elementInstanceId)
        });
      }
    } catch (err) {
      setError('Failed to delete element');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading space editor...</div>;
  }

  if (!space) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Space not found or access denied
        </div>
        <button
          onClick={() => navigate('/spaces')}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Spaces
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Editing: {space.name}</h1>
        <div>
          <button
            onClick={() => navigate(`/space/${spaceId}/view`)}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
          >
            Enter Space
          </button>
          <button
            onClick={() => navigate('/spaces')}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Back to Spaces
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Element Palette */}
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-4">Elements</h2>
            <div className="grid grid-cols-2 gap-2">
              {availableElements.map(element => (
                <div
                  key={element.id}
                  className={`p-2 border rounded cursor-pointer ${
                    selectedElement?.id === element.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onClick={() => setSelectedElement(element)}
                >
                  <div 
                    className="h-16 bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${element.imageUrl})` }}
                  ></div>
                  <div className="text-xs text-center mt-1">
                    {element.width}x{element.height}
                  </div>
                </div>
              ))}
            </div>
            {selectedElement && (
              <div className="mt-4 p-2 bg-blue-50 rounded">
                <div className="text-sm font-medium">Selected Element</div>
                <div className="flex items-center mt-2">
                  <div 
                    className="h-10 w-10 bg-contain bg-center bg-no-repeat mr-2"
                    style={{ backgroundImage: `url(${selectedElement.imageUrl})` }}
                  ></div>
                  <div>
                    <div className="text-xs">Size: {selectedElement.width}x{selectedElement.height}</div>
                    <div className="text-xs">{selectedElement.static ? 'Static' : 'Dynamic'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="w-full lg:w-3/4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-4">
              Space Canvas <span className="text-sm font-normal text-gray-500">({space.dimensions})</span>
            </h2>
            <div className="border border-gray-300 rounded relative overflow-auto bg-gray-100">
              <div 
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="relative"
                style={{
                  width: `${dimensions.width * 20}px`,
                  height: `${dimensions.height * 20}px`,
                  backgroundImage: 'linear-gradient(#e5e5e5 1px, transparent 1px), linear-gradient(90deg, #e5e5e5 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              >
                {space.elements.map(element => (
                  <div
                    key={element.id}
                    className="absolute flex items-center justify-center group"
                    style={{
                      left: `${element.x * 20}px`,
                      top: `${element.y * 20}px`,
                      width: `${element.width * 20}px`,
                      height: `${element.height * 20}px`
                    }}
                  >
                    <img 
                      src={element.imageUrl} 
                      alt="Element"
                      className="max-w-full max-h-full"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleElementDelete(element.id);
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Click on the canvas to place the selected element</p>
              <p>Hover over an element and click the × to remove it</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceEditor;