import React from 'react';
import { tierFromScore, TierName } from '../lib/reputation';

interface TierBadgeProps {
  score: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ score, size = 'sm', showLabel = true }) => {
  const tier = tierFromScore(score);
  const sz = size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5';
  const title = showLabel
    ? `${tier.name} · ${tier.description}${tier.toNext !== null ? ` · ${tier.toNext} pts to ${nextTierName(tier.name)}` : ''}`
    : tier.description;

  return (
    <span
      className={`inline-flex items-center space-x-1 rounded-full border font-mono font-semibold ${tier.badgeClass} ${sz}`}
      title={title}
    >
      <span aria-hidden>{tier.emoji}</span>
      {showLabel && <span>{tier.name}</span>}
    </span>
  );
};

function nextTierName(current: TierName): string {
  switch (current) {
    case 'PROBATION': return 'NOVICE (0)';
    case 'NOVICE': return 'TRUSTED (100)';
    case 'TRUSTED': return 'EXPERT (300)';
    case 'EXPERT': return 'LEGENDARY (800)';
    default: return '';
  }
}
