'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { CompleteRegisterSchema } from '@/lib/schemas';
import { getCurrentSession, createSession } from '@/lib/auth';
import { add } from 'date-fns';
import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';

type SetupAccountResult = {
    success: boolean;
    message: string;
};

export async function setupAccount(
    values: z.infer<typeof CompleteRegisterSchema>
): Promise<SetupAccountResult> {
    try {
        const session = await getCurrentSession();
        if (!session) {
            return { success: false, message: 'Sessão expirada. Por favor, faça login novamente.' };
        }

        const validatedData = CompleteRegisterSchema.parse(values);

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        // Check if subdomain is already taken (excluding current tenant if they somehow already set it)
        const existingTenant = await tenantsCollection.findOne({
            subdomain: validatedData.subdomain,
            _id: { $ne: new ObjectId(session.userId) }
        });

        if (existingTenant) {
            return { success: false, message: 'Este nome de usuário já está em uso.' };
        }

        // Hash password
        const passwordHash = await bcrypt.hash(validatedData.password, 12);
        const trialEndsAt = add(new Date(), { days: 30 });

        // Update tenant
        await tenantsCollection.updateOne(
            { _id: new ObjectId(session.userId) },
            {
                $set: {
                    subdomain: validatedData.subdomain,
                    username: validatedData.subdomain,
                    passwordHash: passwordHash,
                    subscriptionStatus: 'trialing',
                    trialEndsAt: trialEndsAt.toISOString(),
                    updatedAt: new Date(),
                }
            }
        );

        // Update session with new subdomain
        // We need to create a new session because the subdomain is part of the session data
        // and we want to ensure consistency.
        const newToken = await createSession({
            userId: session.userId,
            email: session.email,
            name: session.name,
            subdomain: validatedData.subdomain,
            type: 'tenant',
        });

        const { cookies } = await import('next/headers');
        cookies().set('session_token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return { success: true, message: 'Conta configurada com sucesso!' };

    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, message: error.errors.map(e => e.message).join(', ') };
        }
        console.error('Setup account error:', error);
        return { success: false, message: 'Ocorreu um erro inesperado. Tente novamente.' };
    }
}
