import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { connectionsRouter } from './routes/connections';
import { catalogRouter } from './routes/catalog';
import { ratingsRouter } from './routes/ratings';
import { diaryRouter } from './routes/diary';
import { usersRouter } from './routes/users';
import { statsRouter } from './routes/stats';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { env } from './lib/env';

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.appBaseUrl, credentials: true }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  const v1 = express.Router();
  v1.use('/auth', authRouter);
  v1.use('/connections', connectionsRouter);
  v1.use('/ratings', ratingsRouter);
  v1.use('/diary', diaryRouter);
  v1.use('/users/me/stats', statsRouter);
  v1.use('/users', usersRouter);
  v1.use('/', catalogRouter);
  app.use('/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
