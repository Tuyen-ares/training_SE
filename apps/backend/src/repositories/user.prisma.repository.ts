import {BasePrismaRepository } from '@/shared/base.repository.js'
import type { IUserRepository } from '@/repositories/user.repository.js'
import type { User, CreateUserDto, UpdateUserDto } from '@/models/user.model.js'
import type { PrismaClient } from '../../generated/prisma/index.js'

export class PrismaUserRepository
  extends BasePrismaRepository<User, CreateUserDto, UpdateUserDto>
  implements IUserRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.users)
  }
  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.users.findUnique({ where: { phone } })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.users.findUnique({ where: { email } })
  }
}
