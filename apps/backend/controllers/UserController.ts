import prisma from '../prisma';
import UserRepository from '../repositories/user.repository';
import UserService from '../services/UserService';

const userRepository = new UserRepository(prisma);
const userService = new UserService(userRepository);

const handleGetAllUser = async (req, res) => {
  try{
    const result = await userService.getAllUser();
    return res.status(200).json({
      message: 'Get all user successful',
      users: result,
    });
  }
  catch(err){
    return res.status(500).json({ error : 'Server error'});
  }
}

const handleGetUserById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({ user });
  }
  catch(err){
    return res.status(500).json({ error : 'Server error'});
  }
}

export { handleGetAllUser, handleGetUserById };
