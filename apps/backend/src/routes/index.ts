import userRoutes from '@/routes/user.routes.js';
import authRoutes from '@/routes/auth.routes.js';
import departmentRoutes from '@/routes/department.routes.js';
import brandRoutes from '@/routes/brand.routes.js';
import assetTypeRoutes from '@/routes/asset-type.routes.js';
import assetModelRoutes from '@/routes/asset-model.routes.js';
import assetRoutes from '@/routes/asset.routes.js';
import type { Express } from 'express';
import type { RouteDefinition } from '@/shared/rest-router.js';

const routes: RouteDefinition[] = [
  userRoutes,
  departmentRoutes,
  brandRoutes,
  assetTypeRoutes,
  assetModelRoutes,
  assetRoutes,
  authRoutes,
];
export function registerRoutes(app: Express): void {
  for (const { resource, router } of routes) {
    app.use(`/api/${resource}`, router)
  }
}
