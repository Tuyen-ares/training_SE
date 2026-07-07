class UserRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAll() {
      return this.prisma.users.findMany();
    }

  findById(id) {
    return this.prisma.users.findUnique({
      where: { id },
    });
    }

  findByEmail(email) {
    return this.prisma.users.findUnique({
      where: { email },
    });
    }

  createUser = async({departmentId, role, name, password, email, phone}) =>{
    const user = await this.prisma.users.create({
      data :{
        department_id: departmentId,
        role_id: role,
        name: name,
        password: password,
        email : email,
        phone : phone
      }
   })
   return user;
  }
}
 module.exports = UserRepository;