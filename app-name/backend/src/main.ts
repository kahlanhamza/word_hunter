import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function bootstrap() {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535 || process.env.PORT === '') {
    throw new Error('PORT must be an integer from 0 to 65535');
  }
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'], abortOnError: false });
  app.enableShutdownHooks();
  try {
    await app.listen(port, process.env.HOST ?? '0.0.0.0');
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
