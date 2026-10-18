import type { PromptVisualTone } from '../../data/promptGalleryData';
import styles from './PromptVisual.module.css';

export function PromptVisual({ tone, label, large = false }: { tone: PromptVisualTone; label: string; large?: boolean }) {
  return <div className={`${styles.visual} ${styles[tone]} ${large ? styles.large : ''}`} aria-hidden="true">
    <span className={styles.glow} />
    <span className={styles.form} />
    <span className={styles.topline}>UNI-INSIDE / VISUAL STUDY</span>
    <span className={styles.label}>{label}</span>
    <span className={styles.corner}>✦</span>
  </div>;
}
