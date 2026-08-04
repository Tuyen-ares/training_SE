import type { IBaseRepository } from '@/shared/base.repository.js'



export interface IBaseService<TEntity, TCreateDto, TUpdateDto> {
  getAll(): Promise<TEntity[]>
  getById(id: number): Promise<TEntity | null>
  create(dto: TCreateDto): Promise<{ data?: TEntity; error?: string }>
  update(id: number, dto: TUpdateDto): Promise<TEntity | null>
  delete(id: number): Promise<boolean>
}

export abstract class BaseService<
  TEntity,
  TCreateDto,
  TUpdateDto,
  TRepo extends IBaseRepository<TEntity, TCreateDto, TUpdateDto> = IBaseRepository<TEntity, TCreateDto, TUpdateDto>
> implements IBaseService<TEntity, TCreateDto, TUpdateDto> {
  constructor(protected readonly repo: TRepo) {}

  async getAll(): Promise<TEntity[]> {
    return this.repo.findAll()
  }

  async getById(id: number): Promise<TEntity | null> {
    return this.repo.findById(id)
  }

  async create(dto: TCreateDto): Promise<{ data?: TEntity; error?: string }> {
    const data = await this.repo.create(dto)
    return { data }
  }

  async update(id: number, dto: TUpdateDto): Promise<TEntity | null> {
    return this.repo.update(id, dto)
  }

  async delete(id: number): Promise<boolean> {
    try{
      const res = await this.repo.delete(id)
      return !!res;
    }
    catch{
      return false;
    }
  }
}
