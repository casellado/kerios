import styles from './ScrollOrizzontale.module.css';

interface Props {
  children: React.ReactNode;
  /** Classi extra (es. full-bleed + bordo del registro). */
  className?: string;
}

/**
 * Contenitore con SCROLL ORIZZONTALE (overflow-x) per le tabelle larghe (registro
 * cls/acciaio, layout ST36). NESSUN handler `wheel` custom: la rotella secca scorre
 * su/giù (verticale, default del browser), Shift+rotella scorre dx/sx (orizzontale,
 * sempre nativo). Lo scroll orizzontale resta raggiungibile anche da barra,
 * trackpad e tastiera (il contenitore è focusabile per la navigazione da tastiera).
 */
export function ScrollOrizzontale({ children, className = '' }: Props) {
  return (
    <div className={`${styles.base} ${className}`} tabIndex={0}>
      {children}
    </div>
  );
}
