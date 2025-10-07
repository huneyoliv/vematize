'use server';

import clientPromise from '@/lib/mongodb';
import crypto from 'crypto';
import { Tenant } from '@/lib/types';
import { ObjectId } from 'mongodb';

type TenantDocument = Omit<Tenant, '_id'> & { _id: ObjectId };

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const tenantsCollection = db.collection<TenantDocument>('tenants');

    const tenant = await tenantsCollection.findOne({ ownerEmail: email });

    if (!tenant) {
      // Por segurança, sempre retorna sucesso (não revela se email existe)
      return {
        success: true,
        message: 'Se o email existir em nosso sistema, você receberá um link de recuperação.',
      };
    }

    // Gera token seguro
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Expira em 1 hora

    // Salva token no banco
    await tenantsCollection.updateOne(
      { _id: tenant._id },
      {
        $set: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        },
      }
    );

    // TODO: Implementar envio de email
    // Para desenvolvimento, vamos logar o link
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    console.log(`\n🔑 PASSWORD RESET LINK for ${email}:`);
    console.log(resetUrl);
    console.log(`Token expires at: ${resetExpires.toISOString()}\n`);

    // Em produção, enviar email aqui
    // await sendEmail({
    //   to: email,
    //   subject: 'Recuperação de Senha - Vematize',
    //   html: `Clique no link para redefinir sua senha: ${resetUrl}`
    // });

    return {
      success: true,
      message: 'Se o email existir em nosso sistema, você receberá um link de recuperação.',
    };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return {
      success: false,
      message: 'Ocorreu um erro. Tente novamente.',
    };
  }
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const tenantsCollection = db.collection<TenantDocument>('tenants');

    // Busca tenant com token válido e não expirado
    const tenant = await tenantsCollection.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!tenant) {
      return {
        success: false,
        message: 'Token inválido ou expirado.',
      };
    }

    // Hash da nova senha
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Atualiza senha e remove token
    await tenantsCollection.updateOne(
      { _id: tenant._id },
      {
        $set: { passwordHash },
        $unset: { passwordResetToken: '', passwordResetExpires: '' },
      }
    );

    return {
      success: true,
      message: 'Senha redefinida com sucesso! Faça login com sua nova senha.',
    };
  } catch (error) {
    console.error('Error resetting password:', error);
    return {
      success: false,
      message: 'Ocorreu um erro. Tente novamente.',
    };
  }
}

