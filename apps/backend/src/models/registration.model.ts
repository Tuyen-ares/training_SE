export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SubmitRegistrationInputDto {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface ApproveRegistrationInputDto {
  departmentId: number;
  roleIds?: number[];
}

export interface RejectRegistrationInputDto {
  rejectionReason?: string;
}

export interface RegistrationPersonDto {
  id: number;
  name: string;
}

export interface RegistrationRequestDto {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: RegistrationStatus;
  rejectionReason: string | null;
  reviewer: RegistrationPersonDto | null;
  reviewedAt: string | null;
  createdUser: RegistrationPersonDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationPageDto {
  items: RegistrationRequestDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RegistrationListQuery {
  status: RegistrationStatus;
  q?: string;
  page: number;
  pageSize: number;
}
