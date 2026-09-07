/**
 * Reputation tier math — mirrors contracts/reputation_ledger.py TIER_THRESHOLDS.
 * If you change the thresholds, change them in BOTH places or the
 * ReputationLedger.tier() view and this frontend derivation will disagree.
 */
export const TIER_PROBATION = 'PROBATION';
export const TIER_NOVICE = 'NOVICE';
export const TIER_TRUSTED = 'TRUSTED';
export const TIER_EXPERT = 'EXPERT';
export const TIER_LEGENDARY = 'LEGENDARY';

export type TierName =
  | typeof TIER_PROBATION
  | typeof TIER_NOVICE
  | typeof TIER_TRUSTED
  | typeof TIER_EXPERT
  | typeof TIER_LEGENDARY;

// Descending — first match wins.
const TIER_THRESHOLDS: Array<[number, TierName]> = [
  [800, TIER_LEGENDARY],
  [300, TIER_EXPERT],
  [100, TIER_TRUSTED],
  [0, TIER_NOVICE],
];

export interface TierInfo {
  name: TierName;
  badgeClass: string;
  emoji: string;
  nextThreshold: number | null;   // null if already at top tier
  toNext: number | null;
  description: string;
}

const TIER_META: Record<TierName, { badgeClass: string; emoji: string; description: string }> = {
  [TIER_LEGENDARY]: {
    badgeClass: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10',
    emoji: '👑',
    description: '800+ pts — top-of-ledger reviewers whose votes have consistently mirrored AI Jury verdicts.',
  },
  [TIER_EXPERT]: {
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
    emoji: '⭐',
    description: '300-799 pts — deeply aligned reviewers trusted with high-stake papers.',
  },
  [TIER_TRUSTED]: {
    badgeClass: 'bg-teal-500/10 text-teal-300 border-teal-500/40',
    emoji: '✓',
    description: '100-299 pts — established track record of aligned reviews.',
  },
  [TIER_NOVICE]: {
    badgeClass: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    emoji: '·',
    description: '0-99 pts — newcomer, no negative alignment on record.',
  },
  [TIER_PROBATION]: {
    badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
    emoji: '⚠',
    description: 'Negative score — net misaligned reviews. Rebuild reputation before staking again.',
  },
};

export function tierFromScore(score: number): TierInfo {
  const name: TierName = score < 0
    ? TIER_PROBATION
    : (TIER_THRESHOLDS.find(([t]) => score >= t)?.[1] ?? TIER_NOVICE);

  // Find the next tier threshold above current score.
  const above = TIER_THRESHOLDS
    .filter(([t]) => t > score)
    .sort((a, b) => a[0] - b[0])[0];
  const nextThreshold = above ? above[0] : null;
  const toNext = above ? above[0] - score : null;

  const meta = TIER_META[name];
  return {
    name,
    badgeClass: meta.badgeClass,
    emoji: meta.emoji,
    description: meta.description,
    nextThreshold,
    toNext,
  };
}
