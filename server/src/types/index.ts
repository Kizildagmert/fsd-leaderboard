/** Shared TypeScript types — to be implemented */

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  rewardAmount?: number;
}

export interface CurrentUserContext {
  rank: number;
  score: number;
  neighbors: LeaderboardEntry[] | null;
  rewardAmount?: number;
}

export interface LeaderboardResponse {
  week: number;
  prizePool: number;
  topHundred: LeaderboardEntry[];
  currentUser: CurrentUserContext | null;
}

export interface ApiError {
  error: string;
  code: string;
}
