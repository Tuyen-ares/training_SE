import userRoutes from '@/routes/user.routes';
import app from '@/app';

const routes = [
  userRoutes,
  // authRoute, (Khi nào làm xong file auth.routes.ts thì mở comment ra là xong)
];
for (const route of routes) {
  app.use(`/${route.resource}`, route.router);
}