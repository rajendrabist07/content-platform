import { createApp } from './app';
import { env } from './config/env';
import { logger } from './core/logger/logger';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});