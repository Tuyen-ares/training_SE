import userRoutes from '@/routes/user.routes.js';
import authRoutes from '@/routes/auth.routes.js';
import departmentRoutes from '@/routes/department.routes.js';
import brandRoutes from '@/routes/brand.routes.js';
import assetTypeRoutes from '@/routes/asset-type.routes.js';
import assetModelRoutes from '@/routes/asset-model.routes.js';
import assetRoutes from '@/routes/asset.routes.js';
import rbacRoutes from '@/routes/rbac.routes.js';
import borrowRequestRoutes from '@/routes/borrow-request.routes.js';
import borrowRequestDetailRoutes from '@/routes/borrow-request-detail.routes.js';
import borrowHistoryRoutes from '@/routes/borrow-history.routes.js';
import assetIssueRoutes from '@/routes/asset-issue.routes.js';
import notificationRoutes from '@/routes/notification.routes.js';
import type { Express } from 'express';
import type { RouteDefinition } from '@/shared/rest-router.js';

const routes: RouteDefinition[] = [
  userRoutes,
  departmentRoutes,
  brandRoutes,
  assetTypeRoutes,
  assetModelRoutes,
  assetRoutes,
  rbacRoutes,
  borrowRequestRoutes,
  borrowRequestDetailRoutes,
  borrowHistoryRoutes,
  assetIssueRoutes,
  notificationRoutes,
  authRoutes,
];
export function registerRoutes(app: Express): void {
  for (const { resource, router } of routes) {
    app.use(`/api/${resource}`, router)
  }
}
