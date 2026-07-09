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

export function createRestRouter(controller: IRestController) {
  const router = Router()

  router.get('/', controller.getAll)
  router.get('/:id', controller.getById)
  router.post('/', controller.create)
  router.patch('/:id', controller.update)
  router.delete('/:id', controller.delete)

  return router
}