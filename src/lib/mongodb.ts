// lib/mongodb.ts
import mongoose, { Mongoose } from 'mongoose';

// 1. Define proper types for the cached connection
interface MongooseCache {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
}

// 2. Extend the global namespace with type safety
declare global {
    namespace NodeJS {
        interface Global {
            mongoose: MongooseCache;
        }
    }
}

// 3. Get environment variable with strict type checking
const MONGODB_URI: string | undefined = process.env.MONGODB_URI;

// 4. Environment validation with proper type guard
if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// 5. Initialize cache with proper typing
const globalWithMongoose = global as typeof global & {
    mongoose: MongooseCache;
};

let cached: MongooseCache = globalWithMongoose.mongoose || { conn: null, promise: null };

// 6. Main connection function with full type safety
async function dbConnect(): Promise<Mongoose> {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts: mongoose.ConnectOptions = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };

        cached.promise = mongoose.connect(MONGODB_URI!, opts)
            .then((mongooseInstance: Mongoose) => {
                console.log('✅ MongoDB connected successfully');
                return mongooseInstance;
            })
            .catch((error: unknown) => {
                console.error('❌ MongoDB connection failed', error);
                throw new Error(
                    error instanceof Error
                        ? `Database connection failed: ${error.message}`
                        : 'Database connection failed'
                );
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error: unknown) {
        cached.promise = null;
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Unknown database connection error');
    }

    return cached.conn;
}

export default dbConnect;