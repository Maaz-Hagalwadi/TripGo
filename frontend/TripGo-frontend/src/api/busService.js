const API_BASE_URL = 'http://localhost:8080';

export const searchBuses = async (from, to, date) => {
  try {
    const url = `${API_BASE_URL}/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`;
    console.log('Searching buses with URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Search failed with status:', response.status);
      throw new Error('Failed to fetch buses');
    }

    const data = await response.json();
    console.log('Search results:', data);
    return data;
  } catch (error) {
    console.error('Error searching buses:', error);
    throw error;
  }
};
