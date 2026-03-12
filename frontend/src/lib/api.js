// src/lib/api.js

/**
 * Helper to construct full API URLs.
 * In development, Vite proxys /api calls to localhost:5000.
 * In production (Vercel), we must use the VITE_API_URL env variable to hit the Render backend.
 */
export const getApiUrl = (endpoint) => {
    // If VITE_API_URL is provided (e.g., https://academic-assistant-backend.onrender.com)
    // prepend it to the endpoint. Otherwise, rely on the Vite proxy / relative path.
    const baseUrl = import.meta.env.VITE_API_URL || '';
    
    // Ensure we don't end up with double slashes like https://url.com//api/v1
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return `${cleanBase}${cleanEndpoint}`;
};
