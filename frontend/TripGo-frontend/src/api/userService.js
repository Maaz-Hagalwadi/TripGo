const API_BASE_URL = 'http://localhost:8080';

export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};
