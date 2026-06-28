import { useEffect, useRef } from 'react';
import styles from './ScrollOrizzontale.module.css';

interface Props {
  children: React.ReactNode;
  /** Classi extra (es. full-bleed + bordo del registro). */
  className?: string;
}

/**
 * Contenitore con SCROLL ORIZZONTALE: la rotella verticale scorre in orizzontale
 * quando il contenuto eccede; al bordo lascia passare lo scroll verticale della
 * pagina (listener non-passivo per poter chiamare preventDefault). Estratto da
 * TabellaPrelievi per riusarlo anche nella scheda-controllo (layout ST36).
 */
export function ScrollOrizzontale({ children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!el || el.scrollWidth <= el.clientWidth || e.shiftKey || e.deltaY === 0) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if ((e.deltaY > 0 && !atEnd) || (e.deltaY < 0 && !atStart)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div ref={ref} className={`${styles.base} ${className}`}>
      {children}
    </div>
  );
}
