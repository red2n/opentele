import { MongoClient } from 'mongodb';
import { FastifyInstance } from 'fastify';
import logger from './appLogger';

export class MongoEssentials {
    static async connectToMongoDB(connectionString: string) {
        const app: FastifyInstance = logger(MongoEssentials.name);

        if (!connectionString) {
            app.log.error('Connection string is required');
            throw new Error('Connection string is required');
        }

        if (typeof connectionString !== 'string') {
            app.log.error('Connection string must be a string');
            throw new Error('Connection string must be a string');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 30000); // 30 seconds

        app.log.info('Attempting to connect to MongoDB server...');

        try {
            const client = new MongoClient(connectionString, { 
                serverSelectionTimeoutMS: 30000 // 30 seconds
            });
            await client.connect();
            clearTimeout(timeout);
            app.log.info('Connected to MongoDB server');
            return client;
        } catch (error) {
            if (controller.signal.aborted) {
                app.log.error('Failed to connect to MongoDB server: Connection timed out');
            } else {
                app.log.error('Failed to connect to MongoDB server:', error);
            }
            throw error;
        }
    }
}