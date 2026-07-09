import prisma from '@/prisma';
import type { CreateUserDto, UpdateUserDto } from '@/model/user.model'
import bcrypt from 'bcrypt';
import UserRepository from '@/repositories/user.repository';

class UserService {
  private userRepository: UserRepository;
  constructor(UserRepository : UserRepository) {
    this.userRepository = UserRepository;
  }

  getAll = async() =>{
    const users = await this.userRepository.findAll();
    return users;
  };

  getById = async (id) => {
  const user = await this.userRepository.findById(id);
  return user;
};

create = async (dto: CreateUserDto) => {
  const existingEmail = await this.userRepository.findByEmail(dto.email)
  const existingPhone = await this.userRepository.findByPhone(dto.phone)

  if (existingEmail) {
    return { error: 'Email already exists' }
  }

  if (existingPhone) {
    return { error: 'Phone number already exists' }
  }

  const hashedPassword = await bcrypt.hash(dto.password, 10)

  const user = await this.userRepository.create({
    ...dto,
    password: hashedPassword,
  })

  return { data: user }
}

 update = async (id : number , data: UpdateUserDto) =>{
    return this.userRepository.update(id, data)
}
  delete = async (id) => {
    return this.userRepository.delete(id)
  
  };
}
export default UserService;
