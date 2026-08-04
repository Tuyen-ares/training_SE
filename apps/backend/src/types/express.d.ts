import type { AccessTokenPayload } from '@/models/auth.model.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export {};
