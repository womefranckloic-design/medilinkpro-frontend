import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, MapPin, MessageSquare, Send, X, Clock, UserCheck, History, Star, RefreshCw } from 'lucide-react';
import { creerAlerte, annulerAlerte, noterAlerte, getMesAlertes } from '../../api/alertes';
import { getToken } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAlerteSocket } from '../../hooks/useAlerteSocket';
import { Card, Button, TextInput, FieldLabel, Textarea, Spinner, PageHeader, EmptyState } from '../../components/ui';

const STATUT_META = {
  EN_ATTENTE: { label: "En attente d'une infirmiere", className: 'bg-(--color-amber-400)/20 text-(--color-amber-500)' },
  REPONDUE: { label: 'En cours', className: 'bg-(--color-sage-100) text-(--color-sage-500)' },
  TERMINEE: { label: 'Terminee', className: 'bg-(--color-petrol-100) text-(--color-petrol-600)' },
  ANNULEE: { label: 'Annulee', className: 'bg-(--color-clay-100) text-(--color-clay-500)' },
};

function formatDateHeure(iso) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function EtoilesNotation({ valeur, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} etoile${n > 1 ? 's' : ''}`}
          className="p-0.5"
        >
          <Star
            size={26}
            className={n <= valeur ? 'fill-(--color-amber-400) text-(--color-amber-400)' : 'text-(--color-petrol-100)'}
          />
        </button>
      ))}
    </div>
  );
}

export default function PatientAlertesPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ adresse: '', message: '' });
  const [alerteEnCours, setAlerteEnCours] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [loadingHistorique, setLoadingHistorique] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [infoRetractation, setInfoRetractation] = useState(false);
  const [notation, setNotation] = useState({ note: 0, commentaire: '' });
  const [envoiNotation, setEnvoiNotation] = useState(false);
  const token = useMemo(() => getToken(), []);

  const chargerHistorique = useCallback(async () => {
    try {
      const data = await getMesAlertes(user.userId);
      setHistorique(data);
      const active = data.find((a) => a.statut === 'EN_ATTENTE' || a.statut === 'REPONDUE');
      setAlerteEnCours(active || null);
    } finally {
      setLoadingHistorique(false);
    }
  }, [user.userId]);

  useEffect(() => { chargerHistorique(); }, [chargerHistorique]);

  const onAlerteMiseAJour = useCallback((alerte) => {
    setAlerteEnCours((prev) => {
      if (!prev || prev.id !== alerte.id) return prev;
      // L'infirmiere s'est retractee : l'alerte repasse de REPONDUE a EN_ATTENTE.
      if (prev.statut === 'REPONDUE' && alerte.statut === 'EN_ATTENTE') {
        setInfoRetractation(true);
        setTimeout(() => setInfoRetractation(false), 6000);
      }
      return alerte;
    });
    setHistorique((prev) => prev.map((a) => (a.id === alerte.id ? alerte : a)));
  }, []);

  const subscriptions = useMemo(
    () => [{ destination: '/user/queue/alertes', onMessage: onAlerteMiseAJour }],
    [onAlerteMiseAJour]
  );
  useAlerteSocket(token, subscriptions);

  async function handleEnvoyer(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const alerte = await creerAlerte(user.userId, {
        adresse: form.adresse,
        message: form.message || null,
      });
      setAlerteEnCours(alerte);
      setHistorique((prev) => [alerte, ...prev]);
      setForm({ adresse: '', message: '' });
    } catch {
      setErreur("Impossible d'envoyer l'alerte pour le moment. Reessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  async function handleAnnuler() {
    if (!alerteEnCours) return;
    try {
      const alerte = await annulerAlerte(alerteEnCours.id, user.userId);
      setAlerteEnCours(alerte);
      setHistorique((prev) => prev.map((a) => (a.id === alerte.id ? alerte : a)));
    } catch {
      setErreur("Impossible d'annuler l'alerte pour le moment.");
    }
  }

  async function handleNoter(e) {
    e.preventDefault();
    if (!alerteEnCours || notation.note === 0) return;
    setEnvoiNotation(true);
    setErreur(null);
    try {
      const alerte = await noterAlerte(alerteEnCours.id, user.userId, {
        note: notation.note,
        commentaire: notation.commentaire || null,
      });
      setHistorique((prev) => prev.map((a) => (a.id === alerte.id ? alerte : a)));
      setAlerteEnCours(null);
      setNotation({ note: 0, commentaire: '' });
    } catch {
      setErreur("Impossible d'enregistrer votre note pour le moment.");
    } finally {
      setEnvoiNotation(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Soins a domicile"
        description="Envoyez une alerte : toutes les infirmieres connectees la recoivent instantanement."
      />

      {infoRetractation && (
        <div className="flex items-center gap-2 bg-(--color-amber-400)/20 text-(--color-amber-500) text-sm font-medium rounded-xl px-4 py-3">
          <RefreshCw size={15} /> L'infirmiere s'est desistee suite a un imprevu. Votre alerte est de nouveau diffusee aux infirmieres connectees.
        </div>
      )}
      {erreur && (
        <div className="text-sm font-medium text-(--color-clay-500) bg-(--color-clay-100) rounded-xl px-3.5 py-3">
          {erreur}
        </div>
      )}

      {alerteEnCours && ['EN_ATTENTE', 'REPONDUE'].includes(alerteEnCours.statut) ? (
        <Card
          className={`p-6 sm:p-8 ${
            alerteEnCours.statut === 'REPONDUE' ? 'border-(--color-sage-500)/40' : 'border-(--color-amber-400)/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                alerteEnCours.statut === 'REPONDUE' ? 'bg-(--color-sage-100)' : 'bg-(--color-amber-400)/20'
              }`}
            >
              {alerteEnCours.statut === 'REPONDUE' ? (
                <UserCheck size={20} className="text-(--color-sage-500)" />
              ) : (
                <BellRing size={20} className="text-(--color-amber-500) animate-pulse" />
              )}
            </div>
            <div>
              <p className="font-display font-semibold text-(--color-ink-900)">
                {alerteEnCours.statut === 'REPONDUE' ? 'Alerte repondue !' : 'Votre alerte a ete envoyee'}
              </p>
              <p className="text-sm text-(--color-ink-600)">
                {alerteEnCours.statut === 'REPONDUE'
                  ? `${alerteEnCours.infirmierPrenom} ${alerteEnCours.infirmierNom}, infirmier(e), a repondu present et arrive.`
                  : "En attente qu'une infirmiere connectee reponde present..."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-1.5 text-sm text-(--color-ink-600)">
            <MapPin size={14} className="mt-0.5 shrink-0" /> {alerteEnCours.adresse}
          </div>

          {alerteEnCours.statut === 'EN_ATTENTE' && (
            <Button variant="danger" className="mt-5" onClick={handleAnnuler}>
              <X size={15} /> Annuler l'alerte
            </Button>
          )}

          {alerteEnCours.statut === 'REPONDUE' && (
            <form onSubmit={handleNoter} className="mt-6 pt-6 border-t border-(--color-petrol-100) space-y-3">
              <p className="text-sm font-semibold text-(--color-ink-900)">Le soin est termine ? Notez l'intervention :</p>
              <EtoilesNotation valeur={notation.note} onChange={(n) => setNotation((prev) => ({ ...prev, note: n }))} />
              <Textarea
                rows={2}
                placeholder="Un commentaire (optionnel)..."
                value={notation.commentaire}
                onChange={(e) => setNotation((prev) => ({ ...prev, commentaire: e.target.value }))}
              />
              <Button type="submit" variant="amber" disabled={notation.note === 0 || envoiNotation} className="w-full">
                {envoiNotation ? 'Envoi...' : 'Terminer et noter'}
              </Button>
            </form>
          )}
        </Card>
      ) : (
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleEnvoyer} className="space-y-4">
            <div>
              <FieldLabel>Adresse d'intervention</FieldLabel>
              <TextInput
                required
                placeholder="Ex: Quartier Bastos, rue 1.234, Yaounde"
                value={form.adresse}
                onChange={(e) => setForm((prev) => ({ ...prev, adresse: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Message (optionnel)</FieldLabel>
              <Textarea
                rows={3}
                placeholder="Decrivez brievement le soin necessaire..."
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              />
            </div>
            <Button type="submit" variant="amber" disabled={envoi} className="w-full">
              <Send size={15} /> {envoi ? 'Envoi en cours...' : "Envoyer l'alerte a toutes les infirmieres"}
            </Button>
          </form>
        </Card>
      )}

      <div>
        <h2 className="flex items-center gap-1.5 font-display font-semibold text-(--color-ink-900) mb-3">
          <History size={16} /> Historique
        </h2>
        {loadingHistorique ? (
          <div className="flex justify-center py-10"><Spinner className="w-6 h-6" /></div>
        ) : historique.length === 0 ? (
          <Card><EmptyState icon={BellRing} title="Aucune alerte envoyee" description="Votre historique d'alertes apparaitra ici." /></Card>
        ) : (
          <div className="space-y-2.5">
            {historique.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-(--color-ink-900) flex items-center gap-1.5">
                      <MapPin size={13} /> {a.adresse}
                    </p>
                    {a.message && (
                      <p className="text-xs text-(--color-ink-600) flex items-center gap-1.5 mt-1">
                        <MessageSquare size={12} /> {a.message}
                      </p>
                    )}
                    <p className="text-xs text-(--color-ink-300) flex items-center gap-1.5 mt-1">
                      <Clock size={12} /> {formatDateHeure(a.dateCreation)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUT_META[a.statut]?.className}`}>
                    {STATUT_META[a.statut]?.label || a.statut}
                  </span>
                </div>
                {a.statut === 'TERMINEE' && a.note && (
                  <div className="mt-2.5 pt-2.5 border-t border-(--color-petrol-100) flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={13}
                        className={n <= a.note ? 'fill-(--color-amber-400) text-(--color-amber-400)' : 'text-(--color-petrol-100)'}
                      />
                    ))}
                    {a.commentaire && <span className="text-xs text-(--color-ink-600) italic ml-1">"{a.commentaire}"</span>}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
