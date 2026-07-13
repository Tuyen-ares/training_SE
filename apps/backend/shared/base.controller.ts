import type { Request, Response } from 'express'
import { z } from 'zod'
import { ApiResponse } from '@/shared/api-response.js'
import type { IRestController } from '@/shared/rest-router.js'
import type { IBaseService } from '@/shared/base.service.js'

function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((acc, issue) => {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_root'
    acc[key] = [...(acc[key] ?? []), issue.message]
    return acc
  }, {})
}

export abstract class BaseController<TEntity, TCreateDto, TUpdateDto>
  implements IRestController
{
  protected abstract readonly createSchema: z.ZodType<TCreateDto>
  protected abstract readonly updateSchema: z.ZodType<TUpdateDto>
  protected abstract readonly resourceName: string

  constructor(
    protected readonly service: IBaseService<TEntity, TCreateDto, TUpdateDto>
  ) {}

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const items = await this.service.getAll()
      return ApiResponse.ok(res, items)
    } catch {
      return ApiResponse.internalError(res)
    }
  }

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id)
      const item = await this.service.getById(id)
      if (!item) return ApiResponse.notFound(res, `${this.resourceName} not found`)
      return ApiResponse.ok(res, item)
    } catch {
      return ApiResponse.internalError(res)
    }
  }

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = this.createSchema.safeParse(req.body)
      if (!parsed.success) return ApiResponse.badRequest(res, formatZodErrors(parsed.error))
      const result = await this.service.create(parsed.data)
      if (result.error || !result.data) return ApiResponse.conflict(res, result.error)
      return ApiResponse.created(res, result.data)
    } catch {
      return ApiResponse.internalError(res)
    }
  }

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = this.updateSchema.safeParse(req.body)
      if (!parsed.success) return ApiResponse.badRequest(res, formatZodErrors(parsed.error))
      const id = Number(req.params.id)
      const item = await this.service.update(id, parsed.data)
      if (!item) return ApiResponse.notFound(res, `${this.resourceName} not found`)
      return ApiResponse.ok(res, item)
    } catch {
      return ApiResponse.internalError(res)
    }
  }

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id)
      const deleted = await this.service.delete(id)
      if (!deleted) return ApiResponse.notFound(res, `${this.resourceName} not found`)
      return ApiResponse.noContent(res)
    } catch {
      return ApiResponse.internalError(res)
    }
  }
}