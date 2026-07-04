/**
 * Element signature de la page : une ligne de moniteur cardiaque animee,
 * utilisee comme separateur entre sections. Fait echo au monitoring medical
 * plutot qu'une decoration generique.
 */
export default function PulseDivider({ className = '' }) {
  return (
    <div className={`relative w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 48"
        preserveAspectRatio="none"
        className="w-full h-10 sm:h-12"
      >
        <path
          d="M0,24 L140,24 L162,6 L184,42 L206,4 L228,44 L250,24 L390,24 L412,6 L434,42 L456,4 L478,44 L500,24 L640,24 L662,6 L684,42 L706,4 L728,44 L750,24 L890,24 L912,6 L934,42 L956,4 L978,44 L1000,24 L1200,24"
          fill="none"
          stroke="var(--color-petrol-100)"
          strokeWidth="2"
        />
        <path
          d="M0,24 L140,24 L162,6 L184,42 L206,4 L228,44 L250,24 L390,24 L412,6 L434,42 L456,4 L478,44 L500,24 L640,24 L662,6 L684,42 L706,4 L728,44 L750,24 L890,24 L912,6 L934,42 L956,4 L978,44 L1000,24 L1200,24"
          fill="none"
          stroke="var(--color-sage-500)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-pulse-draw"
        />
        <circle cx="1000" cy="24" r="5" fill="var(--color-sage-500)" className="animate-pulse-dot" />
      </svg>
    </div>
  );
}
