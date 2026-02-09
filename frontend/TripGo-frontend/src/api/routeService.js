const API_BASE_URL = 'http://localhost:8080';

const refreshAccessToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
};

const fetchWithAuth = async (url, options = {}) => {
  let response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    } else {
      window.location.href = '/login';
    }
  }

  return response;
};

export const createRoute = async (routeData) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/routes`, {
      method: 'POST',
      body: JSON.stringify(routeData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create route');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error creating route:', error);
    throw error;
  }
};

export const addSegment = async (routeId, segmentData) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/routes/${routeId}/segments`, {
      method: 'POST',
      body: JSON.stringify(segmentData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to add segment');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error adding segment:', error);
    throw error;
  }
};

export const addFare = async (routeId, fareData) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/routes/${routeId}/fares`, {
      method: 'POST',
      body: JSON.stringify(fareData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to add fare');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error adding fare:', error);
    throw error;
  }
};

export const createSchedule = async (routeId, scheduleData) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/routes/${routeId}/schedule`, {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create schedule');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
};

export const getRoutes = async () => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/routes`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch routes');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
};

export const getRouteSegments = async (routeId) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/routes/${routeId}/segments`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch segments');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching segments:', error);
    throw error;
  }
};

export const recomputeDistance = async (routeId) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/routes/${routeId}/recompute-distance`, {
      method: 'PATCH',
    });
    
    if (!response.ok) {
      throw new Error('Failed to recompute distance');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error recomputing distance:', error);
    throw error;
  }
};

export const getRouteSchedules = async (routeId) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/schedules`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      console.warn('Schedule endpoint not available yet');
      return [];
    }
    
    const allSchedules = await response.json();
    return allSchedules.filter(schedule => schedule.route?.id === routeId);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }
};

export const getAllSchedules = async () => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/schedules`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      return [];
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }
};

export const getSchedule = async (scheduleId) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/schedules/${scheduleId}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch schedule');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }
};

export const deleteSchedule = async (scheduleId) => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/operator/schedules/${scheduleId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete schedule');
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};
