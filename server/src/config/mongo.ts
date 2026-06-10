import mongoose from 'mongoose';

/**
 * Registers Mongoose connection lifecycle event listeners.
 * Logs connected, error, and disconnected states to the console.
 */
function registerMongooseEvents(): void {
  mongoose.connection.on('connected', () => {
    console.log('[MongoDB] ✅ Connected successfully.');
  });

  mongoose.connection.on('error', (err: Error) => {
    console.error('[MongoDB] ❌ Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] ⚠️  Disconnected from database.');
  });
}

/**
 * Connects to MongoDB using the MONGODB_URI environment variable.
 * Registers connection event listeners before initiating the connection.
 */
export async function connectMongo(): Promise<void> {
  registerMongooseEvents();

  await mongoose.connect(process.env.MONGODB_URI as string);
}
