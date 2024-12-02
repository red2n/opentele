import dotenv from 'dotenv';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Collection } from 'mongodb';
import logger from './appLogger';
import { MongoEssentials } from './mongoEssentials';
import { KafkaEssentials } from './kafkaEssentials';
import { getDirectories, getConnectionString, logRoutes } from './utils';
import os from 'os';

const SERVICE_NAME = 'Service';

dotenv.config();
const PORT: number = parseInt(process.env.PORT || '8080');
const app: FastifyInstance = logger(SERVICE_NAME);

let lastActivityTime = Date.now();
let totalIdleTime = 0;
let rGuestStayCollection: Collection;

app.addHook('onRequest', (request, _reply, done) => {
  lastActivityTime = Date.now();
  app.log.info(`Incoming request: ${request.method} ${request.url}`);
  done();
});

app.addHook('onResponse', (request, reply, done) => {
  const statusCode = reply.statusCode;
  if (statusCode >= 200 && statusCode < 300) {
    app.log.info(`Response sent for: ${request.method} ${request.url} with status ${statusCode}`);
  } else {
    app.log.error(`Response sent for: ${request.method} ${request.url} with status ${statusCode}`);
  }
  done();
});

app.get('/getDirectories', async (_request: FastifyRequest, reply: FastifyReply) => {
  const homeDir = os.homedir();
  const directories = getDirectories(homeDir);
  reply.send(directories);
});

app.get('/getFiles', async (_request: FastifyRequest, reply: FastifyReply) => {
  const homeDir = os.homedir();
  const directories = getDirectories(homeDir);
  reply.send(directories);
});

const checkIdleTime = () => {
  const currentTime = Date.now();
  const idleTime = currentTime - lastActivityTime;
  if (idleTime > 60000) { // 1 minute
    totalIdleTime += idleTime;
    app.log.info(`Service is idle. Total idle time: ${totalIdleTime / 1000} seconds`);
    lastActivityTime = currentTime; // Reset last activity time
  }
};

setInterval(checkIdleTime, 60000); // Check every minute

app.setNotFoundHandler((request, reply) => {
  app.log.error(`Route not found: ${request.method} ${request.url}`);
  reply.status(404).send({ error: 'Route not found' });
});

const start = async () => {
  try {
    await app.listen({ port: PORT });
    logRoutes(app);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

const initialize = async () => {
  try {
    const connectionString = getConnectionString();
    const client = await MongoEssentials.connectToMongoDB(connectionString);
    const db = client.db(process.env.DB_NAME);
    rGuestStayCollection = db.collection('rGuestStay');
    rGuestStayCollection.findOne({}).then((result) => {
      app.log.info('First document in rGuestStay collection:', result?._id);
    });
    await KafkaEssentials.connectToKafka();
    await start();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

initialize();

process.on('SIGINT', async () => {
  app.log.info('Shutting down gracefully...');
  try {
    await KafkaEssentials.disconnectFromKafka();
    await app.close();
    app.log.info('Server closed');
    process.exit(0);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
});