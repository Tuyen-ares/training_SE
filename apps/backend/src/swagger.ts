import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';

const spec = yaml.parse(
  readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf-8'),
);

export function mountSwagger(app: Express): void {
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(spec, {
    customSiteTitle: 'BigIn Asset API Docs',
  }));
}
