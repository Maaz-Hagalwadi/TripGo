import { apiGet, apiPost, apiDelete } from './apiClient';

export const getSavedRoutes   = ()                       => apiGet('/saved-routes');
export const saveRoute        = (fromCity, toCity)       => apiPost('/saved-routes', { fromCity, toCity });
export const unsaveRoute      = (id)                     => apiDelete(`/saved-routes/${id}`);
