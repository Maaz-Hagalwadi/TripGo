const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
};

const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  let response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = localStorage.getItem('accessToken');
      response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(newToken && { 'Authorization': `Bearer ${newToken}` }),
          ...options.headers,
        },
      });
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }

  return response;
};

export const getAmenities = async () => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/amenities`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to fetch amenities: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
};

export const createAmenity = async (code, description) => {
  try {
    const response = await fetch(`${API_BASE_URL}/amenities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, description }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create amenity: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error creating amenity:', error);
    throw error;
  }
};

export const createBus = async (busData) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/buses`, {
      method: 'POST',
      body: JSON.stringify(busData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Failed to create bus: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error creating bus:', error);
    throw error;
  }
};

export const getBuses = async () => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/buses`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch buses: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching buses:', error);
    throw error;
  }
};

export const updateBus = async (busId, busData) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/buses/${busId}`, {
      method: 'PUT',
      body: JSON.stringify(busData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Failed to update bus: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error updating bus:', error);
    throw error;
  }
};

export const deleteBus = async (busId) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/buses/${busId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Failed to delete bus: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting bus:', error);
    throw error;
  }
};
