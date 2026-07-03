import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL } from '../api/client';

/**
 * Ouvre une connexion WebSocket (STOMP over SockJS) authentifiee par JWT vers
 * le backend, et s'abonne aux destinations fournies pour recevoir les mises a
 * jour d'alertes de soins a domicile en temps reel (voir WebSocketConfig cote
 * backend). La connexion se reconnecte automatiquement en cas de coupure.
 *
 * @param {string|null} token - JWT de l'utilisateur connecte (aucune connexion si absent)
 * @param {Array<{ destination: string, onMessage: (payload: any) => void }>} subscriptions
 */
export function useAlerteSocket(token, subscriptions) {
  const [connected, setConnected] = useState(false);
  const subscriptionsRef = useRef(subscriptions);
  subscriptionsRef.current = subscriptions;

  useEffect(() => {
    if (!token) return undefined;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws-alertes`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      onConnect: () => {
        setConnected(true);
        subscriptionsRef.current.forEach(({ destination, onMessage }) => {
          client.subscribe(destination, (message) => {
            try {
              onMessage(JSON.parse(message.body));
            } catch {
              // Message non JSON, ignore.
            }
          });
        });
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();

    return () => {
      client.deactivate();
    };
    // Se reconnecte uniquement si le token change (les callbacks passes dans
    // `subscriptions` doivent s'appuyer sur des setState fonctionnels pour
    // rester a jour sans figurer dans les dependances).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { connected };
}
