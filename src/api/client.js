import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Les fichiers uploades (ex: photos d'etablissements) sont renvoyes par l'API sous forme
// d'URL relative (/uploads/...). On les prefixe avec l'hote du backend pour l'affichage.
export function resolveMediaUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}

// Injecte automatiquement le token JWT stocke en session sur chaque requete sortante.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('medilinkpro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Expose la lecture du token pour les canaux hors-axios (ex: WebSocket temps reel des alertes).
export function getToken() {
  return sessionStorage.getItem('medilinkpro_token');
}

// Si le token est expire ou invalide, l'API renvoie 401 : on deconnecte proprement.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('medilinkpro_token');
      sessionStorage.removeItem('medilinkpro_user');
      if (window.location.pathname !== '/connexion') {
        window.location.href = '/connexion';
      }
    }
    return Promise.reject(error);
  }
);
