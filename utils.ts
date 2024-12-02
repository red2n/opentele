import fs from 'fs';
import path from 'path';
import { FastifyInstance } from 'fastify';

export function getDirectories(srcPath: string): string[] {
  return fs.readdirSync(srcPath).filter((file) => {
    return fs.statSync(path.join(srcPath, file)).isDirectory();
  });
}

export const getConnectionString = (): string => {
  const connectionString = process.env.MONGO_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('MONGO_CONNECTION_STRING is not defined in .env file');
  }
  return connectionString;
};

export const logRoutes = (app: FastifyInstance) => {
  app.log.info('Available routes:');
  const routes = app.printRoutes().split('\n').filter(route => !route.includes('/*'));
  routes.forEach(route => {
    const [method, url] = route.trim().split(' ');
    app.log.info(`Registered ${method} ${url}`);
  });
};