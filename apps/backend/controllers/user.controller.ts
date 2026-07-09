import type { Request, Response } from 'express'
import { ApiResponse } from '@/shared/api-response'
import UserService from '@/services/user.service';
class UserController {
  constructor(private userService: UserService) {}
 getAll = async (req:Request, res:Response) => {
  try{
    const result = await this.userService.getAll();
    return ApiResponse.ok(res, result);
  }
  catch(err){
    console.error('Get all users failed:', err);
    return ApiResponse.internalError(res);
  }
}

 getById = async (req:Request, res:Response) => {
  try {
    const id = Number(req.params.id as number);
    const user = await this.userService.getById(id);
    if (!user) {
      return ApiResponse.notFound(res, `User with id ${id} not found`);
    }
    return ApiResponse.ok(res, { user });
  }
  catch(err){
    console.error('Get user by id failed:', err);
    return ApiResponse.internalError(res);
  }
 }
  create = async (req:Request, res:Response) => {
    const userData = req.body;
    try {
      const user = await this.userService.create(userData);
      return ApiResponse.created(res, { user });
    } catch (err) {
      console.error('Create user failed:', err);
      return ApiResponse.internalError(res);
    }
  }  

  update = async (req:Request, res:Response) => {
    const userData = req.body;
     try {
      const user = await this.userService.update(Number(req.params.id as number), userData);
      return ApiResponse.ok(res, { user });
    } catch (err) {
      console.error('Update user failed:', err);
      return ApiResponse.internalError(res);
    }
  }

  delete = async (req:Request, res:Response) => {
     try {
      const user = await this.userService.delete(req.params.id);
      return ApiResponse.ok(res, { user });
    } catch (err) {
      console.error('Delete user failed:', err);
      return ApiResponse.internalError(res);
    }
  }

}


export default UserController;
