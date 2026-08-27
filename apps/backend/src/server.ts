import app from '@/app.js';
import { validateProductionMediaConfig } from '@/shared/media-config.js';
import prisma from '@/prisma.js';
import { createNotificationRuntime } from '@/notifications/composition.js';

validateProductionMediaConfig();

const port = process.env.PORT || 3000;
const runtime = createNotificationRuntime(prisma);

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  runtime.start();
});

let shuttingDown=false;
async function shutdown(){
  if(shuttingDown)return;shuttingDown=true;
  const timeout=setTimeout(()=>process.exit(1),Number(process.env.NOTIFICATION_SHUTDOWN_TIMEOUT_MS||30000));timeout.unref();
  runtime.beginShutdown();
  server.close(async()=>{await runtime.stop();await prisma.$disconnect();clearTimeout(timeout);process.exit(0);});
}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
