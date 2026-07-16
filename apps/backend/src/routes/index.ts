import userRoutes from '@/routes/user.routes.js';
import authRoutes from '@/routes/auth.routes.js';
import type { Express } from 'express';
import type { RouteDefinition } from '@/shared/rest-router.js';

const routes: RouteDefinition[] = [
  userRoutes,
  authRoutes,
];
export function registerRoutes(app: Express): void {
  for (const { resource, router } of routes) {
    app.use(`/api/${resource}`, router)
  }
}
