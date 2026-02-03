'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';

const ResetPasswordSchema = z.object({
    token: z.string().min(1, 'Token é obrigatório'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'A confirmação de senha deve ter pelo menos 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
});

type ResetPasswordResult = {
    success: boolean;
    message: string;
};

export async function resetPassword(
    values: z.infer<typeof ResetPasswordSchema>
): Promise<ResetPasswordResult> {
    try {
        const validatedData = ResetPasswordSchema.parse(values);

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const tenant = await tenantsCollection.findOne({
            resetPasswordToken: validatedData.token,
            resetPasswordExpires: { $gt: new Date() },
        });

        if (!tenant) {
            return { success: false, message: 'Link de redefinição inválido ou expirado.' };
        }

        const passwordHash = await bcrypt.hash(validatedData.password, 12);

        await tenantsCollection.updateOne(
            { _id: tenant._id },
            {
                $set: {
                    passwordHash,
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                },
            }
        );

        return { success: true, message: 'Senha redefinida com sucesso! Você já pode fazer login com a nova senha.' };

    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, message: error.errors.map(e => e.message).join(', ') };
        }
        console.error('Reset password error:', error);
        return { success: false, message: 'Ocorreu um erro inesperado. Tente novamente.' };
    }
}
