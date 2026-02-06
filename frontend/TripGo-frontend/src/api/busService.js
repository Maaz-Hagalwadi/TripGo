const API_BASE_URL = 'http://localhost:8080';

export const searchBuses = async (from, to, date) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch buses');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching buses:', error);
    throw error;
  }
};
