import { z } from 'zod'
import { BaseController } from '@/shared/base.controller.js'
import type { UserService } from '@/services/user.service.js'
import type { User, CreateUserDto, UpdateUserDto } from '@/models/user.model.js'
class UserController extends BaseController<User, CreateUserDto, UpdateUserDto>  {
  
    protected readonly createSchema = z.object({
    department_id: z.number().int().positive(),
    role: z.enum(['admin', 'staff']),
    name: z.string().min(1),
    email: z.email(),
    phone: z.string().min(1),
    password: z.string().min(6)
  })

  protected readonly updateSchema = z.object({
    department_id: z.number().int().positive().optional(),
    role: z.enum(['admin', 'staff']).optional(),
    name: z.string().min(1).optional(),
    email: z.email().optional(),
    phone: z.string().min(1).optional(),
    password: z.string().min(6).optional()
  })
  protected readonly resourceName = 'User'
  constructor(service: UserService) {
    super(service)
   }

}


export default UserController;
