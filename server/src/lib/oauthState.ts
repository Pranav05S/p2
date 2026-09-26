import jwt from 'jsonwebtoken';
import { env } from './env';

// Short-lived signed state param carries the userId through the provider's
// redirect so /callback (hit by the provider, unauthenticated) knows who to
// attach the connection to, and can't be tampered with in transit.

export function signOAuthState(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtAccessSecret, { expiresIn: '10m' });
}

export function verifyOAuthState(state: string): string {
  const payload = jwt.verify(state, env.jwtAccessSecret) as { sub: string };
  return payload.sub;
}
