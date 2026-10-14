import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { HERO_TIMING, TRUST_SIGNALS } from './heroConfig';
import styles from './Hero.module.css';

interface RollingCountersProps {
  start: boolean;
  reducedMotion: boolean;
  onComplete: () => void;
}

function RollingNumber({ value, plus, label, index, start, reducedMotion, onStop }: {
  value: string;
  plus: boolean;
  label: string;
  index: number;
  start: boolean;
  reducedMotion: boolean;
  onStop: (index: number) => void;
}) {
  const [stopped, setStopped] = useState(reducedMotion);
  const digits = [...value];

  useEffect(() => {
    if (reducedMotion) setStopped(true);
  }, [reducedMotion]);

  useEffect(() => {
    if (stopped || reducedMotion) onStop(index);
  }, [stopped, reducedMotion, index, onStop]);

  return (
    <div className={styles.trustSignal} data-hero-counter={label} data-rolling={start && !stopped && !reducedMotion}>
      <span className={styles.srOnly}>{value}{plus ? '+' : ''} {label.toLowerCase()}</span>
      <div className={styles.counterValue} aria-hidden="true" data-counter={value} data-stopped={stopped || reducedMotion}>
        {digits.map((digit, position) => {
          const finalIndex = 20 + Number(digit);
          const slots = Array.from({ length: finalIndex + 1 }, (_, slot) => slot % 10);
          const reelStyle = {
            '--digit-final': finalIndex,
            '--roll-duration': `${HERO_TIMING.roll}ms`,
            '--roll-delay': `${index * HERO_TIMING.stagger + position * 65}ms`,
          } as CSSProperties;
          return (
            <span className={styles.digitWindow} key={position}>
              <span
                className={`${styles.digitReel} ${reducedMotion || stopped ? styles.reelFinal : start ? styles.reelRolling : ''}`}
                style={reelStyle}
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget && position === digits.length - 1) setStopped(true);
                }}
              >
                {slots.map((slot, slotIndex) => <span className={styles.digitSlot} key={slotIndex}>{slot}</span>)}
              </span>
            </span>
          );
        })}
        {plus && <span data-hero-plus="" className={`${styles.plus} ${stopped || reducedMotion ? styles.plusVisible : ''}`}>+</span>}
      </div>
      <span className={styles.counterLabel} aria-hidden="true">{label}</span>
    </div>
  );
}

export function RollingCounters({ start, reducedMotion, onComplete }: RollingCountersProps) {
  const completed = useRef(new Set<number>());
  const onStop = useCallback((index: number) => {
    if (completed.current.has(index)) return;
    completed.current.add(index);
    if (completed.current.size === TRUST_SIGNALS.length) onComplete();
  }, [onComplete]);

  return (
    <div className={styles.trust} aria-label="Our experience">
      {TRUST_SIGNALS.map((signal, index) => (
        <RollingNumber key={signal.label} {...signal} index={index} start={start} reducedMotion={reducedMotion} onStop={onStop} />
      ))}
    </div>
  );
}
