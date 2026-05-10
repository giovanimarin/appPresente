import {
  CommScope,
  GuardianCommStatus,
  GuardianCommType,
  SchoolCommStatus,
  SchoolCommType,
} from './enums';

export interface Communication {
  id: string;
  schoolId: string;
  // Author (mutually exclusive)
  createdBy?: string | null;
  guardianId?: string | null;
  // Type (mutually exclusive)
  schoolType?: SchoolCommType | null;
  guardianType?: GuardianCommType | null;
  // Content
  title: string;
  body: string;
  // Scope
  scope: CommScope;
  // Status (mutually exclusive)
  schoolStatus?: SchoolCommStatus | null;
  guardianStatus?: GuardianCommStatus | null;
  // Confirmation
  requiresConfirmation: boolean;
  protocolNumber?: string | null;
  internalNote?: string | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  // Reminders
  autoReminder: boolean;
  reminderCount: number;
  // Scheduling
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  cancelledAt?: Date | null;
  cancelledBy?: string | null;
  createdAt: Date;
}

export interface CommunicationRead {
  id: string;
  communicationId: string;
  guardianId: string;
  studentId: string;
  readAt: Date;
  deviceType?: string | null;
  ipAddress?: string | null;
}

export interface Attachment {
  id: string;
  communicationId: string;
  type: string;
  s3Key: string;
  url: string;
  sizeBytes?: number | null;
  mimeType?: string | null;
  createdAt: Date;
}
