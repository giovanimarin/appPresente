import { randomUUID } from 'crypto';
import { extname } from 'path';
import { prisma } from '../../config/database';
import { generateUploadUrl, generateDownloadUrl, deleteObject, buildStorageKey } from '../../config/storage';
import type { RequestUploadDto, ConfirmUploadDto } from './uploads.schemas';

const GUARDIAN_ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export class UploadsService {
  async requestGuardianUpload(guardianId: string, dto: { filename: string; contentType: string; size: number; formId: string }) {
    if (!GUARDIAN_ALLOWED_TYPES.includes(dto.contentType)) {
      throw { status: 400, code: 'INVALID_FILE_TYPE', message: 'Tipo de arquivo não permitido' };
    }
    if (dto.size > 10 * 1024 * 1024) {
      throw { status: 400, code: 'FILE_TOO_LARGE', message: 'Arquivo deve ter no máximo 10 MB' };
    }

    const form = await prisma.form.findFirst({ where: { id: dto.formId } });
    if (!form) throw { status: 404, code: 'FORM_NOT_FOUND', message: 'Formulário não encontrado' };

    const link = await prisma.studentGuardian.findFirst({
      where: { guardianId, status: { in: ['ACTIVE', 'PENDING_INVITE'] }, student: { schoolId: form.schoolId } },
    });
    if (!link) throw { status: 403, code: 'FORBIDDEN', message: 'Sem acesso a este formulário' };

    const ext = extname(dto.filename).toLowerCase();
    const key = buildStorageKey(form.schoolId, 'forms', `${randomUUID()}${ext}`);
    const uploadUrl = await generateUploadUrl(key, dto.contentType);
    return { uploadUrl, key, expiresIn: 300 };
  }

  async requestUpload(schoolId: string, userId: string, dto: RequestUploadDto) {
    const ext = extname(dto.filename).toLowerCase();
    const uniqueName = `${randomUUID()}${ext}`;
    const key = buildStorageKey(schoolId, dto.folder, uniqueName);

    const uploadUrl = await generateUploadUrl(key, dto.contentType);

    return {
      uploadUrl,
      key,
      expiresIn: 300,
    };
  }

  async confirmUpload(schoolId: string, userId: string, dto: ConfirmUploadDto) {
    // Verify the entity belongs to this school
    if (dto.entityType === 'COMMUNICATION') {
      const comm = await prisma.communication.findFirst({
        where: { id: dto.entityId, schoolId },
      });
      if (!comm) throw { status: 404, code: 'ENTITY_NOT_FOUND', message: 'Comunicado não encontrado' };
    }

    const attachment = await prisma.attachment.create({
      data: {
        communicationId: dto.entityType === 'COMMUNICATION' ? dto.entityId : undefined,
        agendaEventId: dto.entityType === 'AGENDA_EVENT' ? dto.entityId : undefined,
        schoolId,
        uploadedBy: userId,
        filename: dto.filename,
        contentType: dto.contentType,
        size: dto.size,
        storageKey: dto.key,
        url: dto.key,
      },
    });

    return attachment;
  }

  async getDownloadUrl(schoolId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, schoolId },
    });
    if (!attachment) throw { status: 404, code: 'ATTACHMENT_NOT_FOUND', message: 'Anexo não encontrado' };

    const url = await generateDownloadUrl(attachment.storageKey);
    return { url, expiresIn: 3600 };
  }

  async deleteAttachment(schoolId: string, attachmentId: string, userId: string) {
    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, schoolId },
    });
    if (!attachment) throw { status: 404, code: 'ATTACHMENT_NOT_FOUND', message: 'Anexo não encontrado' };

    await deleteObject(attachment.storageKey);

    await prisma.attachment.delete({ where: { id: attachmentId } });

    return { deleted: true };
  }
}
