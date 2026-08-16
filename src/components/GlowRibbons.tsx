import { createPortal } from 'react-dom';
import { motion } from 'motion/react';

type GlowRibbonsProps = {
  intensity?: 'hero' | 'subtle';
};

export function GlowRibbons({ intensity = 'hero' }: GlowRibbonsProps) {
  const isHero = intensity === 'hero';
  const uid = isHero ? 'hero' : 'app';

  const node = (
    <div
      aria-hidden
      className={
        isHero
          ? 'pointer-events-none absolute inset-0 overflow-hidden hero-ribbons'
          : 'pointer-events-none hero-ribbons hero-ribbons-fixed'
      }
    >
      <motion.svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1 }}
      >
        <defs>
          <linearGradient id={`${uid}-ribbonFill`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff7a2a" />
            <stop offset="45%" stopColor="#e85d18" />
            <stop offset="100%" stopColor="#7a2a0c" />
          </linearGradient>
          <linearGradient id={`${uid}-ribbonEdge`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffd0a8" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#ffb06a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ff7a2a" stopOpacity="0.2" />
          </linearGradient>
          <filter id={`${uid}-ribbonBlur`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.path
          d="M-80,620 C220,80 420,980 820,380 C1080,40 1280,720 1520,220"
          fill="none"
          stroke={`url(#${uid}-ribbonFill)`}
          strokeWidth="92"
          strokeLinecap="round"
          filter={`url(#${uid}-ribbonBlur)`}
          initial={{ pathLength: 0.2, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
        <path
          d="M-80,620 C220,80 420,980 820,380 C1080,40 1280,720 1520,220"
          fill="none"
          stroke={`url(#${uid}-ribbonEdge)`}
          strokeWidth="1.4"
        />

        <motion.path
          d="M-120,240 C180,760 520,-40 860,540 C1100,920 1320,180 1560,640"
          fill="none"
          stroke={`url(#${uid}-ribbonFill)`}
          strokeWidth="78"
          strokeLinecap="round"
          filter={`url(#${uid}-ribbonBlur)`}
          initial={{ pathLength: 0.2, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.92 }}
          transition={{ duration: 1.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        />
        <path
          d="M-120,240 C180,760 520,-40 860,540 C1100,920 1320,180 1560,640"
          fill="none"
          stroke={`url(#${uid}-ribbonEdge)`}
          strokeWidth="1.4"
        />
      </motion.svg>
    </div>
  );

  if (!isHero && typeof document !== 'undefined') {
    return createPortal(node, document.body);
  }

  return node;
}

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 16.5C7.5 6 13 4 20 8.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4 8.5C8 18 16 19 20 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
