import { UserRole } from './enums';

export interface User {
  id: string;
  schoolId: string;
  unitId?: string | null;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  active: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Guardian {
  id: string;
  schoolId: string;
  name: string;
  phone: string;
  email?: string | null;
  pushToken?: string | null;
  deviceType?: string | null;
  avatarUrl?: string | null;
  active: boolean;
  activatedAt?: Date | null;
  lastSeenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string;
  school_id: string;
  role: UserRole | 'GUARDIAN';
  iat?: number;
  exp?: number;
}
