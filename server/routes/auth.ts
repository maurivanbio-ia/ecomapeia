import { Router, Request, Response } from "express";
import * as bcrypt from "bcryptjs";
import { db } from "../db";
import { usuarios, passwordResets } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { sendPasswordResetEmail } from "../email";

const router = Router();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/forgot-password
// Solicita código de reset por e-mail
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "E-mail é obrigatório." });

    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email.trim().toLowerCase()));

    // Always return success to avoid exposing which emails exist
    if (!usuario) {
      return res.json({ success: true });
    }

    // Invalidate any existing unused codes for this email
    await db
      .update(passwordResets)
      .set({ used: true })
      .where(and(eq(passwordResets.email, email.trim().toLowerCase()), eq(passwordResets.used, false)));

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(passwordResets).values({
      email: email.trim().toLowerCase(),
      code,
      expires_at: expiresAt,
      used: false,
    });

    await sendPasswordResetEmail(usuario.email, code, usuario.nome);

    return res.json({ success: true });
  } catch (err) {
    console.error("[Auth] forgot-password error:", err);
    return res.status(500).json({ message: "Erro interno. Tente novamente." });
  }
});

// POST /api/auth/verify-reset-code
// Verifica o código de 6 dígitos
router.post("/verify-reset-code", async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "E-mail e código são obrigatórios." });

    const [reset] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.email, email.trim().toLowerCase()),
          eq(passwordResets.code, code.trim()),
          eq(passwordResets.used, false),
          gt(passwordResets.expires_at, new Date())
        )
      );

    if (!reset) {
      return res.status(400).json({ message: "Código inválido ou expirado." });
    }

    return res.json({ valid: true });
  } catch (err) {
    console.error("[Auth] verify-reset-code error:", err);
    return res.status(500).json({ message: "Erro interno. Tente novamente." });
  }
});

// POST /api/auth/reset-password
// Redefine a senha com o código válido
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "A senha deve ter no mínimo 6 caracteres." });
    }

    const [reset] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.email, email.trim().toLowerCase()),
          eq(passwordResets.code, code.trim()),
          eq(passwordResets.used, false),
          gt(passwordResets.expires_at, new Date())
        )
      );

    if (!reset) {
      return res.status(400).json({ message: "Código inválido ou expirado." });
    }

    const senhaHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(usuarios)
      .set({ senha_hash: senhaHash })
      .where(eq(usuarios.email, email.trim().toLowerCase()));

    await db
      .update(passwordResets)
      .set({ used: true })
      .where(eq(passwordResets.id, reset.id));

    return res.json({ success: true });
  } catch (err) {
    console.error("[Auth] reset-password error:", err);
    return res.status(500).json({ message: "Erro interno. Tente novamente." });
  }
});

// PUT /api/auth/update-avatar
// Atualiza a foto de perfil do usuário logado
router.put("/update-avatar", async (req: Request, res: Response) => {
  try {
    const { userId, avatarBase64 } = req.body;
    if (!userId) return res.status(400).json({ message: "userId é obrigatório." });

    const avatarUrl = avatarBase64 || null;

    const [updated] = await db
      .update(usuarios)
      .set({ avatar_url: avatarUrl })
      .where(eq(usuarios.id, userId))
      .returning();

    if (!updated) return res.status(404).json({ message: "Usuário não encontrado." });

    const { senha_hash, ...safeUser } = updated;
    return res.json({ user: safeUser });
  } catch (err) {
    console.error("[Auth] update-avatar error:", err);
    return res.status(500).json({ message: "Erro ao atualizar foto de perfil." });
  }
});

export default router;

