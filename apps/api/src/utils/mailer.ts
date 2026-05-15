async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
  console.log(`[EMAIL] Para: ${to} | Assunto: ${subject}`);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL MOCK] RESEND_API_KEY não configurada — e-mail não enviado`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? 'noreply@apppresente.com.br',
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[EMAIL] Resend error:', res.status, err);
    throw new Error(`Falha ao enviar e-mail: ${res.status} ${err}`);
  }

  const data = await res.json() as { id?: string };
  console.log(`[EMAIL] Enviado com sucesso. ID: ${data.id}`);
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const subject = 'Seu código de acesso — Presente';
  const text = `Seu código de acesso é: ${code}\n\nVálido por 10 minutos. Não compartilhe com ninguém.`;
  console.log(`[EMAIL] OTP para ${to}: ${code}`);
  try {
    await sendEmail(to, subject, text);
  } catch {
    // OTP já salvo no Redis — falha no e-mail não deve impedir o fluxo
  }
}

export async function sendWelcomeEmail(
  to: string,
  adminName: string,
  schoolName: string,
  firstAccessUrl: string,
): Promise<void> {
  const subject = `Bem-vindo ao Presente — ${schoolName}`;

  const text = [
    `Olá, ${adminName}!`,
    '',
    `A escola ${schoolName} foi cadastrada no Presente.`,
    '',
    'Para definir sua senha e acessar o sistema, clique no link abaixo:',
    firstAccessUrl,
    '',
    'Este link expira em 72 horas.',
    '',
    'Caso não tenha solicitado este cadastro, ignore este e-mail.',
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1f2937">Bem-vindo ao Presente!</h2>
      <p style="color:#555">Olá, <strong>${adminName}</strong>!</p>
      <p style="color:#555">A escola <strong>${schoolName}</strong> foi cadastrada no Presente.</p>
      <p style="color:#555">Para definir sua senha e acessar o sistema, clique no botão abaixo:</p>
      <a href="${firstAccessUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Definir minha senha
      </a>
      <p style="color:#9ca3af;font-size:13px">Este link expira em 72 horas. Caso não tenha solicitado este cadastro, ignore este e-mail.</p>
    </div>
  `;

  await sendEmail(to, subject, text, html);
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  const subject = 'Redefinição de senha — Presente';
  const text = [
    `Olá, ${name}!`,
    '',
    'Recebemos uma solicitação para redefinir sua senha.',
    '',
    'Clique no link abaixo para criar uma nova senha:',
    resetUrl,
    '',
    'Este link expira em 1 hora.',
    '',
    'Se você não solicitou isso, ignore este e-mail.',
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1f2937">Redefinição de senha</h2>
      <p style="color:#555">Olá, <strong>${name}</strong>!</p>
      <p style="color:#555">Recebemos uma solicitação para redefinir sua senha.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Redefinir senha
      </a>
      <p style="color:#9ca3af;font-size:13px">Este link expira em 1 hora. Se você não solicitou isso, ignore este e-mail.</p>
    </div>
  `;

  await sendEmail(to, subject, text, html);
}

export async function sendGuardianWelcomeEmail(
  to: string,
  guardianName: string,
  schoolName: string,
  firstAccessUrl: string,
): Promise<void> {
  const subject = `Seu acesso ao Presente — ${schoolName}`;

  const text = [
    `Olá${guardianName ? `, ${guardianName}` : ''}!`,
    '',
    `Você foi cadastrado(a) como responsável no Presente pela escola ${schoolName}.`,
    '',
    'Para definir sua senha e acessar o sistema, clique no link abaixo:',
    firstAccessUrl,
    '',
    'Este link expira em 72 horas.',
    '',
    'Caso não reconheça este cadastro, entre em contato com a escola.',
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1f2937">Bem-vindo ao Presente!</h2>
      <p style="color:#555">Olá${guardianName ? `, <strong>${guardianName}</strong>` : ''}!</p>
      <p style="color:#555">Você foi cadastrado(a) como responsável no Presente pela escola <strong>${schoolName}</strong>.</p>
      <p style="color:#555">Clique no botão abaixo para definir sua senha e acessar o sistema:</p>
      <a href="${firstAccessUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Definir minha senha
      </a>
      <p style="color:#9ca3af;font-size:13px">Este link expira em 72 horas. Caso não reconheça este cadastro, entre em contato com a escola.</p>
    </div>
  `;

  try {
    await sendEmail(to, subject, text, html);
  } catch (e) {
    console.error('[mailer] Falha ao enviar e-mail de boas-vindas ao responsável:', e);
  }
}

export async function sendCommunicationEmail(
  to: string,
  guardianName: string,
  commTitle: string,
  commBody: string,
  schoolName?: string,
): Promise<void> {
  const subject = `${commTitle} — ${schoolName ?? 'Presente'}`;

  const text = [
    `Olá${guardianName ? `, ${guardianName}` : ''},`,
    '',
    `Você recebeu um comunicado da escola${schoolName ? ` ${schoolName}` : ''}:`,
    '',
    `📋 ${commTitle}`,
    '',
    commBody,
    '',
    '---',
    'Acesse o Presente para confirmar a leitura.',
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <p style="color:#555">Olá${guardianName ? `, <strong>${guardianName}</strong>` : ''},</p>
      <p style="color:#555">Você recebeu um comunicado${schoolName ? ` da escola <strong>${schoolName}</strong>` : ''}:</p>
      <div style="background:#f9fafb;border-left:4px solid #6366f1;border-radius:6px;padding:16px 20px;margin:20px 0">
        <p style="font-size:16px;font-weight:600;color:#1f2937;margin:0 0 8px">${commTitle}</p>
        <p style="color:#374151;white-space:pre-wrap;margin:0">${commBody}</p>
      </div>
      <p style="color:#9ca3af;font-size:13px">Acesse o Presente para confirmar a leitura.</p>
    </div>
  `;

  await sendEmail(to, subject, text, html);
}
