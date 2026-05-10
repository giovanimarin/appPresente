import { LinkStatus } from './enums';

export interface Student {
  id: string;
  schoolId: string;
  classId: string;
  name: string;
  enrollmentCode?: string | null;
  birthDate?: Date | null;
  gender?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Class {
  id: string;
  schoolId: string;
  unitId?: string | null;
  coordinatorId?: string | null;
  name: string;
  grade?: string | null;
  shift?: string | null;
  year?: number | null;
  room?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentGuardian {
  studentId: string;
  guardianId: string;
  schoolId: string;
  relationship: string;
  isPrimary: boolean;
  status: LinkStatus;
  invitedBy?: string | null;
  invitedAt?: Date | null;
  activatedAt?: Date | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
}
