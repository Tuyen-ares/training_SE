
export type Role = 'admin' | 'staff';
export interface User {
  id?: number;
  department_id: number;
  role: Role;
  name: string;
  email: string;
  phone: string;
  password: string;
  createdAt?: Date;
}

export interface CreateUserDto {
 department_id: number;
  role: Role;
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface UpdateUserDto {
 department_id?: number;
  role?: Role;
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
}