import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

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

function getLogoBase64(): string {
  try {
    const candidates = [
      path.join(process.cwd(), "assets/images/ecomapeia-logo-clean.png"),
      path.join(process.cwd(), "assets/images/ecomapeia-logo-transparent.png"),
      path.join(process.cwd(), "assets/images/ecomapeia-logo.png"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p).toString("base64");
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

export async function sendPasswordResetEmail(to: string, code: string, nome: string): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    console.error("[Email] Transporter não criado — verifique SMTP_USER e SMTP_PASS.");
    return false;
  }

  const logoB64 = getLogoBase64();
  const logoImg = logoB64
    ? `<img src="data:image/png;base64,${logoB64}" alt="EcoMapeIA" style="height:52px;width:auto;display:block;margin:0 auto;" />`
    : `<div style="font-size:28px;font-weight:800;color:#0f5132;letter-spacing:-0.5px;font-family:Arial,sans-serif;">EcoMape<span style="color:#f0a800;">IA</span></div>`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EcoMapeIA — Redefinição de Senha</title>
</head>
<body style="margin:0;padding:0;background:#eef3ee;font-family:Arial,'Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef3ee;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <!-- TOP RIBBON -->
          <tr>
            <td style="height:5px;background:linear-gradient(90deg,#0f5132 0%,#22a55e 50%,#f0a800 100%);border-radius:6px 6px 0 0;"></td>
          </tr>

          <!-- HEADER: white with logo -->
          <tr>
            <td style="background:#ffffff;padding:32px 40px 24px;text-align:center;border-left:1px solid #e0e8e0;border-right:1px solid #e0e8e0;">
              ${logoImg}
              <div style="margin-top:10px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#7aaa8a;">
                Sistema de Vistoria Ambiental
              </div>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="height:2px;background:linear-gradient(90deg,#e8f5ee 0%,#22a55e 30%,#0f5132 50%,#22a55e 70%,#e8f5ee 100%);border-left:1px solid #e0e8e0;border-right:1px solid #e0e8e0;"></td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px 32px;border-left:1px solid #e0e8e0;border-right:1px solid #e0e8e0;">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#0f5132;">
                Olá, ${nome}!
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#4a5a4a;line-height:1.65;">
                Recebemos uma solicitação de redefinição de senha para sua conta no
                <strong style="color:#0f5132;">EcoMapeIA</strong>.
                Use o código abaixo no aplicativo para criar uma nova senha:
              </p>

              <!-- Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#f0faf4 0%,#e6f7ee 100%);border:1.5px solid #22a55e;border-radius:14px;padding:0;overflow:hidden;">
                    <!-- top accent line -->
                    <div style="height:3px;background:linear-gradient(90deg,#0f5132,#22a55e,#0f5132);border-radius:14px 14px 0 0;"></div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="text-align:center;padding:20px 20px 6px;">
                          <div style="font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1a7a46;margin-bottom:14px;">
                            Código de Verificação
                          </div>
                          <div style="font-size:48px;font-weight:800;color:#0f5132;letter-spacing:12px;font-family:'Courier New',monospace;line-height:1;">
                            ${code}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="text-align:center;padding:10px 20px 20px;">
                          <div style="display:inline-block;background:#ffffff;border:1px solid #c0e8ce;border-radius:20px;padding:5px 16px;">
                            <span style="font-size:12px;color:#1a7a46;font-weight:600;">
                              Válido por <strong>15 minutos</strong>
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:0 10px 10px 0;padding:14px 16px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.55;">
                      <strong>Não solicitou a redefinição?</strong><br/>
                      Ignore este e-mail. Sua senha permanece a mesma e nenhuma ação é necessária.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0f5132;padding:20px 40px;border-radius:0 0 6px 6px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.9);font-weight:600;">
                EcoMapeIA &bull; EcoBrasil Ambiental
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);">
                Este é um e-mail automático — por favor, não responda.
              </p>
            </td>
          </tr>

          <!-- BOTTOM SPACING -->
          <tr><td style="height:24px;"></td></tr>

        </table>
      </td>
    </tr>
  </table>
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
