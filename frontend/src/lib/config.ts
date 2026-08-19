// URL base da API. O backend libera CORS para http://localhost:5173 (Vite dev).
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
export const API_BASE = `${API_URL}/api`;
