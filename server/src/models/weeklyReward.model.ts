import mongoose, { Schema, Document } from 'mongoose';

/**
 * Shape of a weekly reward record stored in MongoDB.
 * Written only by the cron job — never used for real-time queries.
 */
export interface IWeeklyReward extends Document {
  userId: string;
  week: number;
  rank: number;
  score: number;
  rewardAmount: number;
  distributedAt: Date;
}

const weeklyRewardSchema = new Schema<IWeeklyReward>({
  userId:        { type: String,  required: true, index: true },
  week:          { type: Number,  required: true, index: true },
  rank:          { type: Number,  required: true },
  score:         { type: Number,  required: true },
  rewardAmount:  { type: Number,  required: true },
  distributedAt: { type: Date,    required: true },
});

export const WeeklyReward = mongoose.model<IWeeklyReward>('WeeklyReward', weeklyRewardSchema);
