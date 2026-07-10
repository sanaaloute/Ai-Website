import { Request } from 'express';

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: string;
  reset_token: string | null;
  reset_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface RequestWithAdmin extends Request {
  admin?: AdminUser;
}

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
}
