import nodemailer from "nodemailer";

function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("[Email] SMTP_USER ou SMTP_PASS não configurados.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(to: string, code: string, nome: string): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    console.error("[Email] Transporter não criado — verifique SMTP_USER e SMTP_PASS.");
    return false;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1a6b3a, #2d9c5c); padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px; }
        .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px; }
        .body { padding: 32px 24px; }
        .greeting { color: #333; font-size: 15px; margin-bottom: 12px; }
        .desc { color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
        .code-box { background: #f0f9f4; border: 2px solid #2d9c5c; border-radius: 12px; text-align: center; padding: 24px 16px; margin-bottom: 24px; }
        .code { font-size: 42px; font-weight: 700; color: #1a6b3a; letter-spacing: 8px; font-family: 'Courier New', monospace; }
        .expire { color: #888; font-size: 12px; margin-top: 10px; }
        .warning { background: #fff8e1; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; color: #7a5c00; font-size: 13px; margin-bottom: 24px; }
        .footer { border-top: 1px solid #eee; padding: 16px 24px; text-align: center; color: #aaa; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EcoMapeIA</h1>
          <p>Sistema de Vistoria Ambiental</p>
        </div>
        <div class="body">
          <p class="greeting">Olá, <strong>${nome}</strong>!</p>
          <p class="desc">
            Recebemos uma solicitação de redefinição de senha para sua conta no EcoMapeIA.
            Use o código abaixo no aplicativo para criar uma nova senha:
          </p>
          <div class="code-box">
            <div class="code">${code}</div>
            <div class="expire">Válido por 15 minutos</div>
          </div>
          <div class="warning">
            Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanece a mesma.
          </div>
        </div>
        <div class="footer">EcoMapeIA &bull; EcoBrasil Ambiental &bull; Todos os direitos reservados</div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"EcoMapeIA" <${process.env.SMTP_USER}>`,
      to,
      subject: `${code} — Código de redefinição de senha EcoMapeIA`,
      html,
    });
    console.log(`[Email] Código de reset enviado para ${to}`);
    return true;
  } catch (err) {
    console.error("[Email] Falha ao enviar e-mail:", err);
    return false;
  }
}
