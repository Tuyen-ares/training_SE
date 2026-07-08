import prisma from '@/prisma';
import bcrypt from 'bcrypt';
import UserRepository from '@/repositories/user.repo';

class UserService {
  private userRepository: UserRepository;
  constructor(UserRepository : UserRepository) {
    this.userRepository = UserRepository;
  }

  getAllUser = async() =>{
    const users = await this.userRepository.findAll();
    return users;
  };

  getUserById = async (id) => {
  const user = await this.userRepository.findById(id);
  return user;
};

 createUser = async({departmentId, role, name, password, email, phone}) =>{
  const existingEmail = await this.userRepository.findByEmail(email);
  const existingPhone = await this.userRepository.findByPhone(phone);
  if (existingEmail) {
    throw new Error('Email already exists');
  }else if (existingPhone) {
    throw new Error('Phone number already exists');
  }else{
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await this.userRepository.createUser({departmentId, role, name, password: hashedPassword, email, phone});
  return user;
  }
};

 updateUser = async (id, {departmentId, roleId, name, password, email, phone}) =>{
  const user = await prisma.users.update({
    where: { id },
    data :{
      department_id: departmentId,
      role_id: roleId,
      name: name,
      password: password,
      email : email,
      phone : phone
    }
  });
  return user;

}
  deleteUser = async (id) => {
    await prisma.users.delete({
      where: { id },
    });
  };
}
export default UserService;
