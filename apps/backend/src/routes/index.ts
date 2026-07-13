import userRoutes from '@/routes/user.routes.js';
import type { Express } from 'express';
import type { RouteDefinition } from '@/shared/rest-router.js';

const routes: RouteDefinition[] = [
  userRoutes,
  // authRoute, (Khi nào làm xong file auth.routes.ts thì mở comment ra là xong)
];
export function registerRoutes(app: Express): void {
  for (const { resource, router } of routes) {
    app.use(`/api/${resource}`, router)
  }
}
