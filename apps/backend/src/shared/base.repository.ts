export interface IBaseRepository<TEntity, TCreateDto, TUpdateDto> {
  findAll(): Promise<TEntity[]>
  findById(id: number): Promise<TEntity | null>
  create(dto: TCreateDto): Promise<TEntity>
  update(id: number, dto: TUpdateDto): Promise<TEntity>
  delete(id: number): Promise<TEntity>
}

export abstract class BasePrismaRepository<
  TEntity,
  TCreateDto,
  TUpdateDto
> implements IBaseRepository<TEntity, TCreateDto, TUpdateDto> {

  constructor(
    protected model: {
      findMany: () => Promise<TEntity[]>;
      findUnique: (args: { where: { id: number } }) => Promise<TEntity | null>;
      create: (args: { data: TCreateDto }) => Promise<TEntity>;
      update: (args: { where: { id: number }; data: TUpdateDto }) => Promise<TEntity>;
      delete: (args: { where: { id: number } }) => Promise<TEntity>;
    }
  ) {}

  async findAll(): Promise<TEntity[]> {
    return this.model.findMany(); 
  }

  async findById(id: number): Promise<TEntity | null> { 
    return this.model.findUnique({
      where: { id } 
    });
  }

  async create(dto: TCreateDto): Promise<TEntity> {
    return this.model.create({
      data: dto 
    }); 
  }

  async update(id: number, dto: TUpdateDto): Promise<TEntity> {
    return this.model.update({
      where: { id },
      data: dto
    });
  }

  async delete(id: number): Promise<TEntity> {
    return this.model.delete({
      where: { id }
    });
  }
}