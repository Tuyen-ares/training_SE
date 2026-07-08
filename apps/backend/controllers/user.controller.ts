import type { Request, Response } from 'express'
import UserService from '@/services/user.service';
class UserController {
  constructor(private userService: UserService) {}
 handleGetAllUser = async (req:Request, res:Response) => {
  try{
    const result = await this.userService.getAllUser();
    return res.status(200).json({
      message: 'Get all user successful',
      users: result,
    });
  }
  catch(err){
    console.error('Get all users failed:', err);
    return res.status(500).json({ error : 'Server error'});
  }
}

 handleGetUserById = async (req:Request, res:Response) => {
  try {
    const id = Number(req.params.id);
    const user = await this.userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({ user });
  }
  catch(err){
    console.error('Get user by id failed:', err);
    return res.status(500).json({ error : 'Server error'});
  }
}
}


export default UserController;
