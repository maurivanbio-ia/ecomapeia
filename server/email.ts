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
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EcoMapeIA — Redefinição de Senha</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #f0f4f0;
      padding: 32px 16px;
      color: #1a2e1a;
    }
    .wrapper { max-width: 520px; margin: 0 auto; }

    /* ── Card ── */
    .card {
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #0f5132 0%, #1a7a46 50%, #22a55e 100%);
      padding: 36px 32px 28px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -60px; right: -60px;
      width: 180px; height: 180px;
      border-radius: 50%;
      background: rgba(255,255,255,0.07);
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -40px; left: -40px;
      width: 130px; height: 130px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
    }
    .logo-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px; height: 56px;
      border-radius: 16px;
      background: rgba(255,255,255,0.18);
      backdrop-filter: blur(8px);
      margin-bottom: 14px;
      border: 1.5px solid rgba(255,255,255,0.30);
    }
    .logo-mark svg { width: 32px; height: 32px; }
    .brand-name {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      line-height: 1;
    }
    .brand-name span { color: #a8f0c0; }
    .brand-tagline {
      font-size: 12.5px;
      font-weight: 500;
      color: rgba(255,255,255,0.72);
      margin-top: 6px;
      letter-spacing: 0.3px;
    }

    /* ── Body ── */
    .body { padding: 36px 32px; }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #0f5132;
      margin-bottom: 10px;
    }
    .desc {
      font-size: 14.5px;
      color: #4a5a4a;
      line-height: 1.65;
      margin-bottom: 28px;
    }

    /* ── Code Box ── */
    .code-box {
      background: linear-gradient(135deg, #f0faf4 0%, #e8f7ee 100%);
      border: 2px solid #22a55e;
      border-radius: 16px;
      text-align: center;
      padding: 28px 20px 20px;
      margin-bottom: 28px;
      position: relative;
      overflow: hidden;
    }
    .code-box::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, #0f5132, #22a55e, #0f5132);
    }
    .code-label {
      font-size: 11px;
      font-weight: 600;
      color: #1a7a46;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .code {
      font-size: 46px;
      font-weight: 800;
      color: #0f5132;
      letter-spacing: 10px;
      font-family: 'Courier New', 'SF Mono', monospace;
      line-height: 1;
    }
    .expire {
      font-size: 12px;
      color: #7a9a7a;
      margin-top: 12px;
      font-weight: 500;
    }
    .expire strong { color: #1a7a46; }

    /* ── Warning ── */
    .warning {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-left: 4px solid #f59e0b;
      padding: 14px 16px;
      border-radius: 10px;
      color: #92400e;
      font-size: 13.5px;
      line-height: 1.55;
    }

    /* ── Footer ── */
    .footer {
      border-top: 1px solid #e8f0e8;
      padding: 18px 32px;
      text-align: center;
      background: #f9fbf9;
    }
    .footer p {
      font-size: 12px;
      color: #9aaa9a;
      line-height: 1.6;
    }
    .footer strong { color: #1a7a46; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">

      <!-- Header -->
      <div class="header">
        <div class="logo-mark">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4C10.48 4 6 8.48 6 14c0 3.5 1.8 6.6 4.5 8.4L16 28l5.5-5.6C24.2 20.6 26 17.5 26 14c0-5.52-4.48-10-10-10z" fill="rgba(255,255,255,0.9)"/>
            <circle cx="16" cy="14" r="4.5" fill="#22a55e"/>
            <path d="M12 14c0-2.2 1.8-4 4-4" stroke="#0f5132" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="brand-name">Eco<span>MapeIA</span></div>
        <div class="brand-tagline">Sistema de Vistoria Ambiental</div>
      </div>

      <!-- Body -->
      <div class="body">
        <p class="greeting">Olá, ${nome}!</p>
        <p class="desc">
          Recebemos uma solicitação de redefinição de senha para sua conta no EcoMapeIA.
          Use o código abaixo no aplicativo para criar uma nova senha:
        </p>

        <div class="code-box">
          <div class="code-label">Código de Verificação</div>
          <div class="code">${code}</div>
          <div class="expire">Válido por <strong>15 minutos</strong></div>
        </div>

        <div class="warning">
          Se você não solicitou a redefinição de senha, ignore este e-mail.
          Sua senha permanece a mesma e nenhuma ação é necessária.
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p><strong>EcoMapeIA</strong> &bull; EcoBrasil Ambiental &bull; Todos os direitos reservados</p>
        <p style="margin-top:4px;">Este é um e-mail automático, por favor não responda.</p>
      </div>

    </div>
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
