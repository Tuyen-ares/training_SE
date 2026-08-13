export interface Vendor {
  id: number;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVendorDto {
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface UpdateVendorDto {
  name?: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export interface VendorListQuery {
  q?: string;
  page: number;
  pageSize: number;
  isActive?: boolean;
}

export interface VendorPage {
  items: Vendor[];
  page: number;
  pageSize: number;
  total: number;
}

export interface VendorReference {
  id: number;
  name: string;
  isActive?: boolean;
}
