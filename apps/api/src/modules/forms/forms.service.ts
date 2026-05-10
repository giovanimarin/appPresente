import { prisma } from '../../config/database';
import { generateProtocol } from '../../utils/protocol';
import type { CreateFormDto, UpdateFormDto, SubmitFormDto, FormListQuery, SubmissionListQuery } from './forms.schemas';

export class FormsService {
  // ── Staff: Listar formulários ─────────────────────────────────────────────

  async list(schoolId: string, query: FormListQuery) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { schoolId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.form.findMany({
        where,
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.form.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── Staff: Criar formulário ───────────────────────────────────────────────

  async create(schoolId: string, userId: string, dto: CreateFormDto) {
    return prisma.form.create({
      data: {
        schoolId,
        createdBy: userId,
        title: dto.title,
        description: dto.description,
        fields: dto.fields,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  // ── Staff: Buscar formulário por ID ──────────────────────────────────────

  async getById(schoolId: string, formId: string) {
    const form = await prisma.form.findFirst({
      where: { id: formId, schoolId },
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
    });
    if (!form) throw { status: 404, code: 'FORM_NOT_FOUND', message: 'Formulário não encontrado' };
    return form;
  }

  // ── Staff: Atualizar formulário ───────────────────────────────────────────

  async update(schoolId: string, formId: string, dto: UpdateFormDto) {
    const form = await prisma.form.findFirst({ where: { id: formId, schoolId } });
    if (!form) throw { status: 404, code: 'FORM_NOT_FOUND', message: 'Formulário não encontrado' };

    return prisma.form.update({
      where: { id: formId },
      data: {
        title: dto.title,
        description: dto.description,
        fields: dto.fields,
        status: dto.status,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  // ── Staff: Listar submissões de um formulário ─────────────────────────────

  async listSubmissions(schoolId: string, formId: string, query: SubmissionListQuery) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    // Verify form belongs to school
    const form = await prisma.form.findFirst({ where: { id: formId, schoolId } });
    if (!form) throw { status: 404, code: 'FORM_NOT_FOUND', message: 'Formulário não encontrado' };

    const where: Record<string, unknown> = { formId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where,
        include: {
          guardian: { select: { id: true, name: true, phone: true } },
          student: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.formSubmission.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── Staff: Resolver submissão ─────────────────────────────────────────────

  async resolveSubmission(schoolId: string, submissionId: string, userId: string, note?: string) {
    const submission = await prisma.formSubmission.findFirst({
      where: { id: submissionId, schoolId },
    });
    if (!submission) {
      throw { status: 404, code: 'SUBMISSION_NOT_FOUND', message: 'Submissão não encontrada' };
    }

    return prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'RESOLVED',
        internalNote: note,
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });
  }

  // ── Guardian: Listar formulários disponíveis ──────────────────────────────

  async getGuardianForms(guardianId: string) {
    const now = new Date();
    const links = await prisma.studentGuardian.findMany({
      where: { guardianId, status: { in: ['ACTIVE', 'PENDING_INVITE'] } },
      select: { student: { select: { schoolId: true } } },
    });
    const schoolIds = [...new Set(links.map((l) => l.student.schoolId))];
    if (schoolIds.length === 0) return [];

    return prisma.form.findMany({
      where: {
        schoolId: { in: schoolIds },
        status: 'OPEN',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        title: true,
        description: true,
        fields: true,
        expiresAt: true,
        createdAt: true,
        schoolId: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Guardian: Enviar submissão ────────────────────────────────────────────

  async submit(guardianId: string, formId: string, dto: SubmitFormDto) {
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        status: 'OPEN',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!form) throw { status: 404, code: 'FORM_NOT_FOUND', message: 'Formulário não encontrado ou encerrado' };

    const link = await prisma.studentGuardian.findFirst({
      where: { guardianId, studentId: dto.studentId, status: 'ACTIVE' },
      include: { student: { select: { schoolId: true } } },
    });
    if (!link) throw { status: 403, code: 'FORBIDDEN', message: 'Sem permissão para este aluno' };

    if (link.student.schoolId !== form.schoolId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Aluno não pertence à escola deste formulário' };
    }

    const protocolNumber = await generateProtocol(form.schoolId);

    return prisma.formSubmission.create({
      data: {
        formId,
        schoolId: form.schoolId,
        guardianId,
        studentId: dto.studentId,
        answers: dto.answers as object,
        protocolNumber,
      },
    });
  }

  // ── Guardian: Ver submissões próprias ─────────────────────────────────────

  async getGuardianSubmissions(guardianId: string) {
    return prisma.formSubmission.findMany({
      where: { guardianId },
      include: {
        form: { select: { id: true, title: true, fields: true } },
        student: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async deletePermanent(schoolId: string, formId: string) {
    const form = await prisma.form.findFirst({ where: { id: formId, schoolId } });
    if (!form) throw { status: 404, code: 'FORM_NOT_FOUND', message: 'Formulário não encontrado' };
    await prisma.form.delete({ where: { id: formId } });
    return { success: true };
  }
}
