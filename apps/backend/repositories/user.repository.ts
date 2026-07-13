import type { IBaseRepository } from '@/shared/base.repository.js';
import type { CreateUserDto , UpdateUserDto, User } from '@/model/user.model.js'
export interface IUserRepository extends IBaseRepository<User, CreateUserDto, UpdateUserDto> {
  findByEmail(email: string): Promise<User | null>
  findByPhone(phone: string): Promise<User | null>
}
