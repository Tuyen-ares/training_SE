import userRoutes from '@/routes/user.routes';
import { Express } from 'express';
import {RouteDefinition} from '@/shared/rest-router';

const routes: RouteDefinition[] = [
  userRoutes,
  // authRoute, (Khi nào làm xong file auth.routes.ts thì mở comment ra là xong)
];
export function registerRoutes(app: Express): void {
  for (const { resource, router } of routes) {
    app.use(`/api/${resource}`, router)
  }
}