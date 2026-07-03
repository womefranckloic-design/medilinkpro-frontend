import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, MapPin, Phone, MessageSquare, Wifi, WifiOff, Clock, CheckCircle2, Star, UndoDot, ClipboardCheck } from 'lucide-react';
import { getAlertesActives, repondreAlerte, retracterAlerte, getInterventionsEnCours, getNoteMoyenneInfirmier } from '../../api/alertes';
import { getToken } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAlerteSocket } from '../../hooks/useAlerteSocket';
import { Card, Button, Spinner, EmptyState, PageHeader } from '../../components/ui';

/** Petit bip synthetise (Web Audio API) pour signaler une nouvelle alerte sans fichier son externe. */
function jouerBip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio non disponible (autoplay bloque, navigateur non supporte...) : on ignore silencieusement.
  }
}

function tempsEcoule(dateIso) {
  const secondes = Math.floor((Date.now() - new Date(dateIso).getTime()) / 1000);
  if (secondes < 60) return "a l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  return `il y a ${heures} h`;
}

function CarteNoteMoyenne({ infirmierId }) {
  const [note, setNote] = useState(null);

  useEffect(() => {
    getNoteMoyenneInfirmier(infirmierId).then(setNote).catch(() => setNote(null));
  }, [infirmierId]);

  if (!note || note.nombreAvis === 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-(--color-petrol-50) text-(--color-petrol-600)">
      <Star size={13} className="fill-(--color-amber-400) text-(--color-amber-400)" />
      {note.moyenne?.toFixed(1)} ({note.nombreAvis} avis)
    </span>
  );
}

export default function InfirmierAlertesPage() {
  const { user } = useAuth();
  const [alertesEnAttente, setAlertesEnAttente] = useState([]);
  const [mesInterventions, setMesInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enCoursId, setEnCoursId] = useState(null);
  const [retractionId, setRetractionId] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const isFirstLoad = useRef(true);
  const token = useMemo(() => getToken(), []);

  useEffect(() => {
    (async () => {
      try {
        const [actives, enCours] = await Promise.all([
          getAlertesActives(),
          getInterventionsEnCours(user.userId),
        ]);
        setAlertesEnAttente(actives);
        setMesInterventions(enCours);
      } finally {
        setLoading(false);
        isFirstLoad.current = false;
      }
    })();
  }, [user.userId]);

  const onAlerteMiseAJour = useCallback((alerte) => {
    if (alerte.statut === 'EN_ATTENTE') {
      setAlertesEnAttente((prev) => {
        if (prev.some((a) => a.id === alerte.id)) return prev.map((a) => (a.id === alerte.id ? alerte : a));
        if (!isFirstLoad.current) jouerBip();
        return [alerte, ...prev];
      });
      setMesInterventions((prev) => prev.filter((a) => a.id !== alerte.id));
      return;
    }

    if (alerte.statut === 'REPONDUE') {
      setAlertesEnAttente((prev) => prev.filter((a) => a.id !== alerte.id));
      setMesInterventions((prev) => {
        if (alerte.infirmierId !== user.userId) return prev.filter((a) => a.id !== alerte.id);
        if (prev.some((a) => a.id === alerte.id)) return prev.map((a) => (a.id === alerte.id ? alerte : a));
        return [alerte, ...prev];
      });
      return;
    }

    // TERMINEE ou ANNULEE : l'alerte disparait des deux listes.
    setAlertesEnAttente((prev) => prev.filter((a) => a.id !== alerte.id));
    setMesInterventions((prev) => {
      const etaitLaMienne = prev.some((a) => a.id === alerte.id);
      if (etaitLaMienne && alerte.statut === 'TERMINEE' && alerte.note) {
        setConfirmation(`Le patient a note votre intervention : ${alerte.note}/5${alerte.commentaire ? ` - "${alerte.commentaire}"` : ''}`);
        setTimeout(() => setConfirmation(null), 6000);
      }
      return prev.filter((a) => a.id !== alerte.id);
    });
  }, [user.userId]);

  const subscriptions = useMemo(
    () => [{ destination: '/topic/alertes', onMessage: onAlerteMiseAJour }],
    [onAlerteMiseAJour]
  );
  const { connected } = useAlerteSocket(token, subscriptions);

  async function handleRepondre(alerteId) {
    setErreur(null);
    setEnCoursId(alerteId);
    try {
      const alerte = await repondreAlerte(alerteId, user.userId);
      setAlertesEnAttente((prev) => prev.filter((a) => a.id !== alerteId));
      setMesInterventions((prev) => [alerte, ...prev]);
    } catch (err) {
      if (err.response?.status === 409) {
        setAlertesEnAttente((prev) => prev.filter((a) => a.id !== alerteId));
        setErreur("Cette alerte venait d'etre prise par une autre infirmiere.");
      } else {
        setErreur('Impossible de repondre a cette alerte pour le moment.');
      }
    } finally {
      setEnCoursId(null);
    }
  }

  async function handleRetracter(alerteId) {
    setErreur(null);
    setEnCoursId(alerteId);
    try {
      await retracterAlerte(alerteId, user.userId);
      setMesInterventions((prev) => prev.filter((a) => a.id !== alerteId));
    } catch {
      setErreur("Impossible de vous retracter de cette intervention pour le moment.");
    } finally {
      setEnCoursId(null);
      setRetractionId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Alertes de soins a domicile"
        description="Les demandes des patients apparaissent ici en temps reel."
        action={
          <div className="flex items-center gap-2">
            <CarteNoteMoyenne infirmierId={user.userId} />
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                connected ? 'bg-(--color-sage-100) text-(--color-sage-500)' : 'bg-(--color-clay-100) text-(--color-clay-500)'
              }`}
            >
              {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
              {connected ? 'Connecte' : 'Connexion...'}
            </span>
          </div>
        }
      />

      {confirmation && (
        <div className="flex items-center gap-2 bg-(--color-sage-100) text-(--color-sage-500) text-sm font-medium rounded-xl px-4 py-3">
          <CheckCircle2 size={16} /> {confirmation}
        </div>
      )}
      {erreur && (
        <div className="flex items-center gap-2 bg-(--color-clay-100) text-(--color-clay-500) text-sm font-medium rounded-xl px-4 py-3">
          {erreur}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-7 h-7" />
        </div>
      ) : (
        <>
          {mesInterventions.length > 0 && (
            <div>
              <h2 className="flex items-center gap-1.5 font-display font-semibold text-(--color-ink-900) mb-3">
                <ClipboardCheck size={16} /> Mes interventions en cours
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {mesInterventions.map((a) => (
                  <Card key={a.id} className="p-5 border-(--color-sage-500)/40">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display font-semibold text-(--color-ink-900)">
                        {a.patientPrenom} {a.patientNom}
                      </p>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-(--color-sage-100) text-(--color-sage-500)">
                        En cours
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm text-(--color-ink-600)">
                      <p className="flex items-start gap-1.5"><MapPin size={14} className="mt-0.5 shrink-0" /> {a.adresse}</p>
                      {a.patientTelephone && (
                        <p className="flex items-center gap-1.5"><Phone size={14} /> {a.patientTelephone}</p>
                      )}
                      {a.message && (
                        <p className="flex items-start gap-1.5"><MessageSquare size={14} className="mt-0.5 shrink-0" /> {a.message}</p>
                      )}
                    </div>

                    {retractionId === a.id ? (
                      <div className="mt-4 flex items-center gap-2">
                        <p className="text-xs text-(--color-ink-600) flex-1">Confirmer la retractation ?</p>
                        <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => setRetractionId(null)}>
                          Non
                        </Button>
                        <Button
                          variant="danger"
                          className="!px-3 !py-1.5"
                          disabled={enCoursId === a.id}
                          onClick={() => handleRetracter(a.id)}
                        >
                          Oui, me retracter
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" className="w-full mt-4" onClick={() => setRetractionId(a.id)}>
                        <UndoDot size={15} /> Un imprevu ? Me retracter
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            {mesInterventions.length > 0 && (
              <h2 className="flex items-center gap-1.5 font-display font-semibold text-(--color-ink-900) mb-3">
                <BellRing size={16} /> Alertes en attente
              </h2>
            )}
            {alertesEnAttente.length === 0 ? (
              <Card>
                <EmptyState
                  icon={BellRing}
                  title="Aucune alerte en attente"
                  description="Vous serez notifiee instantanement des qu'un patient envoie une demande de soins a domicile."
                />
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {alertesEnAttente.map((a) => (
                  <Card key={a.id} className="p-5 border-(--color-amber-400)/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display font-semibold text-(--color-ink-900)">
                          {a.patientPrenom} {a.patientNom}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-(--color-ink-300) mt-0.5">
                          <Clock size={12} /> {tempsEcoule(a.dateCreation)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-(--color-amber-400)/20 text-(--color-amber-500)">
                        En attente
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm text-(--color-ink-600)">
                      <p className="flex items-start gap-1.5"><MapPin size={14} className="mt-0.5 shrink-0" /> {a.adresse}</p>
                      {a.patientTelephone && (
                        <p className="flex items-center gap-1.5"><Phone size={14} /> {a.patientTelephone}</p>
                      )}
                      {a.message && (
                        <p className="flex items-start gap-1.5"><MessageSquare size={14} className="mt-0.5 shrink-0" /> {a.message}</p>
                      )}
                    </div>

                    <Button
                      variant="amber"
                      className="w-full mt-4"
                      disabled={enCoursId === a.id}
                      onClick={() => handleRepondre(a.id)}
                    >
                      {enCoursId === a.id ? 'Envoi...' : 'Je suis disponible - Repondre present'}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
