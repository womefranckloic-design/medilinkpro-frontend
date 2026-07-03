import { useEffect, useRef, useState } from 'react';
import { Building2, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPublicEtablissements } from '../../api/etablissements';
import { resolveMediaUrl } from '../../api/client';

const AUTO_SLIDE_MS = 3500;

/**
 * Mini-carousel de photos pour un etablissement : glisse automatiquement,
 * se met en pause au survol, navigable par fleches et puces.
 */
function PhotoCarousel({ photos, alt }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = photos.length;

  useEffect(() => {
    if (count <= 1 || paused) return undefined;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  function go(delta) {
    setIndex((prev) => (prev + delta + count) % count);
  }

  return (
    <div
      className="relative h-48 sm:h-52 overflow-hidden bg-(--color-petrol-50) group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {photos.map((url) => (
          <img
            key={url}
            src={resolveMediaUrl(url)}
            alt={alt}
            className="w-full h-full object-cover shrink-0"
          />
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Photo precedente"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Photo suivante"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={16} />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {photos.map((url, i) => (
              <button
                key={url}
                type="button"
                aria-label={`Aller a la photo ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Vitrine publique des etablissements de sante crees par les Directeurs,
 * affichee sur la page d'accueil avec leurs photos en carousel glissant.
 */
export default function EtablissementsShowcase() {
  const [etablissements, setEtablissements] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    (async () => {
      try {
        const data = await getPublicEtablissements();
        setEtablissements(data.filter((e) => (e.photos || []).length > 0));
      } catch {
        setEtablissements([]);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Rien a montrer : aucun etablissement n'a encore de photo. On n'affiche pas la section.
  if (!loaded || etablissements.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-(--color-petrol-100)/70">
      <div className="max-w-xl">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-(--color-petrol-700)">
          Nos etablissements partenaires.
        </h2>
        <p className="text-(--color-ink-600) mt-3">
          Decouvrez les hopitaux et cliniques deja presents sur MediLinkPro, en images.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
        {etablissements.map((e) => (
          <div key={e.id} className="bg-white rounded-2xl border border-(--color-petrol-100) overflow-hidden">
            <PhotoCarousel photos={e.photos} alt={e.nom} />
            <div className="p-4">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-(--color-petrol-50) flex items-center justify-center shrink-0">
                  <Building2 size={15} className="text-(--color-petrol-600)" />
                </div>
                <div>
                  <p className="font-display font-semibold text-(--color-ink-900) leading-tight">{e.nom}</p>
                  {e.type && <p className="text-xs text-(--color-amber-500) font-medium mt-0.5">{e.type}</p>}
                </div>
              </div>
              {e.adresse && (
                <p className="flex items-center gap-1.5 text-xs text-(--color-ink-600) mt-2.5">
                  <MapPin size={12} /> {e.adresse}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
