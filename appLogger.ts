import fastify from "fastify";
function formatServiceName(serviceName: string): string {
    return serviceName.replace(/([A-Z])/g, ' $1').trim();
}

export default function logger(SERVICE_NAME: string) {
    const formattedServiceName = formatServiceName(SERVICE_NAME);
    return fastify({
        logger: {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: true,
                    ignore: 'pid,hostname',
                    messageFormat: `[${formattedServiceName}] - {msg}`,
                }
            }
        }
    });
}