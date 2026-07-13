import {BaseService} from '@/shared/base.service.js';
import type { User, CreateUserDto, UpdateUserDto } from '@/models/user.model.js';
import type { IUserRepository } from '@/repositories/user.repository.js';
export class UserService extends BaseService<User, CreateUserDto, UpdateUserDto, IUserRepository> {
  constructor(repo: IUserRepository) {
    super(repo)
  }

  override async create(dto: CreateUserDto): Promise<{ data?: User; error?: string }> {
    const existingUserByEmail = await this.repo.findByEmail(dto.email);
    const existingUserByPhone = await this.repo.findByPhone(dto.phone);

    if (existingUserByEmail) {
      return { error: 'Email already exists' };
    }
    else if (existingUserByPhone) {
      return { error: 'Phone number already exists' };
    }
    return super.create(dto);
  }
}

