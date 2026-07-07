
export type Role = 'admin' | 'staff';
export interface User {
  id?: number;
  departmentId: number;
  role: Role;
  name: string;
  email: string;
  phone: string;
  password: string;
  createdAt?: Date;
}