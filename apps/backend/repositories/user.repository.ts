import type { PrismaClient } from '../generated/prisma';

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

  createUser = async({departmentId, role, name, password, email, phone}: any) =>{
    const user = await this.prisma.users.create({
      data :{
        department_id: departmentId,
        role: role,
        name: name,
        password: password,
        email : email,
        phone : phone
      }
   })
   return user;
  }
}
 export default  UserRepository;