import { PlanType } from './enums';

export interface School {
  id: string;
  name: string;
  cnpj?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  plan: PlanType;
  trialEndsAt?: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchoolUnit {
  id: string;
  schoolId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
