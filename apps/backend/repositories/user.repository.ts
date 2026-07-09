import type { PrismaClient } from '@/generated/prisma';
import type { CreateUserDto , UpdateUserDto } from '@/model/user.model'
class UserRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  findAll() {
      return this.prisma.users.findMany();
    }

  findById(id: number) {
    return this.prisma.users.findUnique({
      where: { id },
    });
    }

  findByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
    }
  findByPhone(phone: string) {
    return this.prisma.users.findUnique({
      where: { phone },
    });
  }

  create = async(dto : CreateUserDto) =>{
    const user = await this.prisma.users.create({
      data :{
        department_id: dto.department_id,
        role: dto.role,
        name: dto.name,
        password: dto.password,
        email : dto.email,
        phone : dto.phone
      }
   })
   return user;
  }

  update = async (id: number, data: UpdateUserDto) => {
     return this.prisma.users.update({
      where: { id },
      data: data
    })
  }

  delete = async (id: number) => {
    return this.prisma.users.delete({
      where: { id },
    });
  }
}
 export default  UserRepository;
