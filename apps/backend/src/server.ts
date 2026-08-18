import app from '@/app.js';
import { validateProductionMediaConfig } from '@/shared/media-config.js';

validateProductionMediaConfig();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
