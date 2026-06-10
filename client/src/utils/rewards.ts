/**
 * Client-side reward calculator — mirrors the server-side formula.
 * Used for display purposes in LeaderboardRow and CurrentUserCard.
 */
const TOTAL_WEIGHT = 4753;

export function calcReward(rank: number, prizePool: number): number {
  if (rank === 1) return prizePool * 0.20;
  if (rank === 2) return prizePool * 0.15;
  if (rank === 3) return prizePool * 0.10;
  if (rank >= 4 && rank <= 100) {
    return ((101 - rank) / TOTAL_WEIGHT) * 0.55 * prizePool;
  }
  return 0;
}

export function formatReward(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M ₺`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K ₺`;
  return `${amount.toFixed(0)} ₺`;
}

export function formatScore(score: number): string {
  return score.toLocaleString('tr-TR');
}
