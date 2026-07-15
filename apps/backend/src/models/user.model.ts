
export interface User {
  id: number;
  department_id: number;
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface CreateUserDto {
  department_id: number;
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface UpdateUserDto {
 department_id?: number;
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
}
