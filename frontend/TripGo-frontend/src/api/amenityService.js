const API_BASE_URL = 'http://localhost:8080';

export const getAmenities = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/amenities`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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

export const createBus = async (busData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/operator/buses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(busData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create bus: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error creating bus:', error);
    throw error;
  }
};
