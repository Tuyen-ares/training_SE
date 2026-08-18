import {Response} from 'express';

const DEFAULT_MESSAGES = {
  badRequest: 'Invalid request',
  notFound: 'Resource not found',
  conflict: 'Resource already exists',
  internalError: 'Internal server error',
  unAuthorized: 'Unauthorized',
  forbidden: 'Forbidden'
}

export class ApiResponse {
  static ok<T>(res: Response, data: T): void {
    res.status(200).json({ data })
  }

  static created<T>(res: Response, data: T): void {
    res.status(201).json({ data })
  }

  static noContent(res: Response): void {
    res.status(204).send()
  }

  static unauthorized(res: Response, message: string = DEFAULT_MESSAGES.unAuthorized): void {
    res.status(401).json({ error: message })
  }

  static forbidden(res: Response, message: string = DEFAULT_MESSAGES.forbidden): void {
    res.status(403).json({ error: message })
  }

  static badRequest(res: Response, errors: unknown, message: string = DEFAULT_MESSAGES.badRequest): void {
    res.status(400).json({ error: message, details: errors })
  }

  static notFound(res: Response, message: string = DEFAULT_MESSAGES.notFound): void {
    res.status(404).json({ error: message })
  }

  static conflict(res: Response, message: string = DEFAULT_MESSAGES.conflict): void {
    res.status(409).json({ error: message })
  }

  static internalError(res: Response, message: string = DEFAULT_MESSAGES.internalError): void {
    res.status(500).json({ error: message })
  }

  static serviceUnavailable(res: Response, message: string = 'Service temporarily unavailable'): void {
    res.status(503).json({ error: message })
  }

}
