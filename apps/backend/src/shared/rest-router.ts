import { Router, type IRouter, type RequestHandler } from 'express';

export interface RouteDefinition {
  resource: string
  router: IRouter
}

export interface IRestController {
  getAll: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  delete: RequestHandler
}

export interface RouterOptions {
  global?: RequestHandler[]
  getAll?: RequestHandler[]
  getById?: RequestHandler[]
  create?: RequestHandler[]
  update?: RequestHandler[]
  delete?: RequestHandler[]
}

export function createRestRouter(controller: IRestController, options?: RouterOptions) {
  const router = Router()
  const globalMiddleware = options?.global ?? []

  router.get('/', ...globalMiddleware, ...(options?.getAll ?? []), controller.getAll)
  router.get('/:id', ...globalMiddleware, ...(options?.getById ?? []), controller.getById)
  router.post('/', ...globalMiddleware, ...(options?.create ?? []), controller.create)
  router.patch('/:id', ...globalMiddleware, ...(options?.update ?? []), controller.update)
  router.delete('/:id', ...globalMiddleware, ...(options?.delete ?? []), controller.delete)

  return router
}
