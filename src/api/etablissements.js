import { api } from './client';

export async function getAllEtablissements() {
  const { data } = await api.get('/api/etablissements');
  return data;
}

// Vitrine publique (page d'accueil) : accessible sans authentification.
export async function getPublicEtablissements() {
  const { data } = await api.get('/api/etablissements/public');
  return data;
}

export async function getEtablissement(id) {
  const { data } = await api.get(`/api/etablissements/${id}`);
  return data;
}

export async function createEtablissement(payload) {
  const { data } = await api.post('/api/etablissements', payload);
  return data;
}

export async function updateEtablissement(id, payload) {
  const { data } = await api.put(`/api/etablissements/${id}`, payload);
  return data;
}

export async function deleteEtablissement(id) {
  await api.delete(`/api/etablissements/${id}`);
}

// Upload d'une ou plusieurs photos pour alimenter le carousel de la vitrine publique.
export async function uploadEtablissementPhotos(id, files) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('fichiers', file));
  const { data } = await api.post(`/api/etablissements/${id}/photos`, formData, {
    // Laisse le navigateur/axios generer le Content-Type multipart avec le bon boundary.
    headers: { 'Content-Type': undefined },
  });
  return data;
}

export async function deleteEtablissementPhoto(id, url) {
  const { data } = await api.delete(`/api/etablissements/${id}/photos`, { params: { url } });
  return data;
}
