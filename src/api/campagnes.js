import { api } from './client';

// Directeur/Admin : lancer une nouvelle campagne pour un etablissement.
export async function creerCampagne(etablissementId, payload) {
  const { data } = await api.post(`/api/etablissements/${etablissementId}/campagnes`, payload);
  return data;
}

// Historique complet des campagnes d'un etablissement (gestion interne, authentifie).
export async function getCampagnesEtablissement(etablissementId) {
  const { data } = await api.get(`/api/etablissements/${etablissementId}/campagnes`);
  return data;
}

// Campagnes actuellement actives d'un etablissement (fiche publique, sans authentification).
export async function getCampagnesActivesEtablissement(etablissementId) {
  const { data } = await api.get(`/api/etablissements/public/${etablissementId}/campagnes`);
  return data;
}

// Fil public de toutes les campagnes actives, tous etablissements confondus.
export async function getCampagnesActives() {
  const { data } = await api.get('/api/campagnes/actives');
  return data;
}

export async function desactiverCampagne(id) {
  const { data } = await api.patch(`/api/campagnes/${id}/desactiver`);
  return data;
}

export async function supprimerCampagne(id) {
  await api.delete(`/api/campagnes/${id}`);
}
