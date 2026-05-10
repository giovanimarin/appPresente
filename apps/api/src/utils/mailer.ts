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
