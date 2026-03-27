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

function findLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "assets/images/ecomapeia-logo-clean.png"),
    path.join(process.cwd(), "assets/images/ecomapeia-logo-transparent.png"),
    path.join(process.cwd(), "assets/images/ecomapeia-logo.png"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function sendPasswordResetEmail(to: string, code: string, nome: string): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    console.error("[Email] Transporter não criado — verifique SMTP_USER e SMTP_PASS.");
    return false;
  }

  const logoPath = findLogoPath();
  const hasLogo = !!logoPath;

  const logoImg = hasLogo
    ? `<img src="cid:ecomapeia-logo" alt="EcoMapeIA" style="height:54px;width:auto;display:block;margin:0 auto;" />`
    : `<div style="font-size:28px;font-weight:800;color:#0f5132;font-family:Arial,sans-serif;">EcoMape<span style="color:#f0a800;">IA</span></div>`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EcoMapeIA — Redefinição de Senha</title>
</head>
<body style="margin:0;padding:0;background:#eef3ee;font-family:Arial,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef3ee;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <!-- TOP RIBBON -->
          <tr>
            <td height="5" style="background:linear-gradient(90deg,#0f5132 0%,#22a55e 50%,#f0a800 100%);border-radius:6px 6px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- HEADER: white with logo -->
          <tr>
            <td style="background:#ffffff;padding:32px 40px 20px;text-align:center;border-left:1px solid #ddeedd;border-right:1px solid #ddeedd;">
              ${logoImg}
              <div style="margin-top:12px;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#7aaa8a;font-family:Arial,sans-serif;">
                Sistema de Vistoria Ambiental
              </div>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td height="2" style="background:linear-gradient(90deg,#e4f2e8 0%,#22a55e 30%,#0f5132 50%,#22a55e 70%,#e4f2e8 100%);font-size:0;line-height:0;border-left:1px solid #ddeedd;border-right:1px solid #ddeedd;">&nbsp;</td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px 32px;border-left:1px solid #ddeedd;border-right:1px solid #ddeedd;">

              <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#0f5132;font-family:Arial,sans-serif;">
                Ol&#225;, ${nome}!
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#4a5a4a;line-height:1.65;font-family:Arial,sans-serif;">
                Recebemos uma solicita&#231;&#227;o de redefini&#231;&#227;o de senha para sua conta no
                <strong style="color:#0f5132;">EcoMapeIA</strong>.
                Use o c&#243;digo abaixo no aplicativo para criar uma nova senha:
              </p>

              <!-- Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;border-radius:14px;overflow:hidden;border:1.5px solid #22a55e;">
                <tr>
                  <td height="3" style="background:linear-gradient(90deg,#0f5132,#22a55e,#0f5132);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="background:linear-gradient(160deg,#f0faf4 0%,#e6f7ee 100%);padding:22px 20px 8px;text-align:center;">
                    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1a7a46;font-family:Arial,sans-serif;margin-bottom:14px;">
                      C&#243;digo de Verifica&#231;&#227;o
                    </div>
                    <div style="font-size:48px;font-weight:800;color:#0f5132;letter-spacing:12px;font-family:'Courier New',monospace;line-height:1;">
                      ${code}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background:linear-gradient(160deg,#f0faf4 0%,#e6f7ee 100%);padding:10px 20px 22px;text-align:center;">
                    <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 auto;">
                      <tr>
                        <td style="background:#ffffff;border:1px solid #c0e8ce;border-radius:20px;padding:5px 18px;">
                          <span style="font-size:12px;color:#1a7a46;font-weight:600;font-family:Arial,sans-serif;">
                            V&#225;lido por <strong>15 minutos</strong>
                          </span>
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
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.55;font-family:Arial,sans-serif;">
                      <strong>N&#227;o solicitou a redefini&#231;&#227;o?</strong><br/>
                      Ignore este e-mail. Sua senha permanece a mesma e nenhuma a&#231;&#227;o &#233; necess&#225;ria.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0f5132;padding:20px 40px;border-radius:0 0 6px 6px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.90);font-weight:600;font-family:Arial,sans-serif;">
                EcoMapeIA &bull; EcoBrasil Ambiental
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.50);font-family:Arial,sans-serif;">
                Este &#233; um e-mail autom&#225;tico &#8212; por favor, n&#227;o responda.
              </p>
            </td>
          </tr>

          <tr><td height="24" style="font-size:0;line-height:0;">&nbsp;</td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const attachments: nodemailer.SendMailOptions["attachments"] = [];
  if (hasLogo && logoPath) {
    attachments.push({
      filename: "ecomapeia-logo.png",
      path: logoPath,
      cid: "ecomapeia-logo",
      contentDisposition: "inline",
    });
  }

  try {
    await transporter.sendMail({
      from: `"EcoMapeIA" <${process.env.SMTP_USER}>`,
      to,
      subject: `${code} \u2014 C\u00f3digo de redefini\u00e7\u00e3o de senha EcoMapeIA`,
      html,
      attachments,
    });
    console.log(`[Email] C\u00f3digo de reset enviado para ${to}`);
    return true;
  } catch (err) {
    console.error("[Email] Falha ao enviar e-mail:", err);
    return false;
  }
}
