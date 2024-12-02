import { Kafka, Consumer, logLevel } from 'kafkajs';
import dotenv from 'dotenv';
import logger from './appLogger';

dotenv.config();

export class KafkaEssentials {
    private static consumer: Consumer;

    static async connectToKafka() {
        const app = logger(KafkaEssentials.name);

        const kafkaConfig = {
            clientId: process.env.KAFKA_CLIENT_ID || 'openTele',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            groupId: process.env.KAFKA_GROUP_ID || 'grpOpenTele',
        };

        if (!kafkaConfig.brokers.length) {
            app.log.error('Kafka brokers are required');
            throw new Error('Kafka brokers are required');
        }

        app.log.info('Attempting to connect to Kafka...');

        try {
            const kafka = new Kafka({
                clientId: kafkaConfig.clientId,
                brokers: kafkaConfig.brokers,
                logLevel: logLevel.INFO,
                logCreator: () => {
                    return ({ namespace, level, log }) => {
                        const { message, ...extra } = log;
                        switch (level) {
                            case logLevel.ERROR:
                                app.log.error({ namespace, ...extra }, message);
                                break;
                            case logLevel.WARN:
                                app.log.warn({ namespace, ...extra }, message);
                                break;
                            case logLevel.INFO:
                                app.log.info({ namespace, ...extra }, message);
                                break;
                            case logLevel.DEBUG:
                                app.log.debug({ namespace, ...extra }, message);
                                break;
                            default:
                                app.log.info({ namespace, ...extra }, message);
                                break;
                        }
                    };
                },
            });

            this.consumer = kafka.consumer({ groupId: kafkaConfig.groupId });
            await this.consumer.connect();
            app.log.info('Connected to Kafka');

            await this.consumer.subscribe({ topic: 'net.navin.connection', fromBeginning: true });

            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    app.log.info(`Received message: ${message.value?.toString()} on topic: ${topic}`);
                },
            });

            app.log.info(`Consumer is listening on topic: net.navin.connection`);
        } catch (error) {
            app.log.error('Failed to connect to Kafka:', error);
            throw error;
        }
    }

    static async disconnectFromKafka() {
        if (this.consumer) {
            await this.consumer.disconnect();
            logger(KafkaEssentials.name).log.info('Disconnected from Kafka');
        }
    }
}