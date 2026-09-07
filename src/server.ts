import express from 'express';
import { env } from './config/env';
import { logger } from './core/logger/logger';
import { errorMiddleware } from './middleware/errorMiddleware';
import postRoutes from './app/api/v1/posts/route';

const app = express();
app.use(express.json());

app.use('/api/v1/posts', postRoutes);

app.use(errorMiddleware); 

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});