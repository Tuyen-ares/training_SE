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
  delete?: RequestHandler
}

export interface RouterOptions {
  global?: RequestHandler[]
  getAll?: RequestHandler[]
  getById?: RequestHandler[]
  create?: RequestHandler[]
  update?: RequestHandler[]
  delete?: RequestHandler[] | false
}

export function createRestRouter(controller: IRestController, options?: RouterOptions) {
  const router = Router()

  const globalMiddleware = options?.global ?? []
  const getAllMw = options?.getAll ?? []
  const getByIdMw = options?.getById ?? []
  const createMw = options?.create ?? []
  const updateMw = options?.update ?? []
  const deleteMw = options?.delete === false ? false : (options?.delete ?? [])

  router.get('/', ...globalMiddleware, ...getAllMw, controller.getAll)
  router.get('/:id', ...globalMiddleware, ...getByIdMw, controller.getById)
  router.post('/', ...globalMiddleware, ...createMw, controller.create)
  router.patch('/:id', ...globalMiddleware, ...updateMw, controller.update)
  if (deleteMw !== false && controller.delete) {
    router.delete('/:id', ...globalMiddleware, ...deleteMw, controller.delete)
  }

  return router
}
