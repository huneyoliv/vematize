'use server';

import clientPromise from '@/lib/mongodb';
import { CreateAdminSchema } from '@/lib/schemas';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

type AdminActionResult = {
  success: boolean;
  message: string;
};

// Action for the initial setup, replaces the temporary 'admin' user
export async function setupInitialAdmin(
  values: z.infer<typeof CreateAdminSchema>
): Promise<AdminActionResult> {
  try {
    const validatedData = CreateAdminSchema.parse(values);
    const client = await clientPromise;
    const db = client.db('vematize');
    const adminCollection = db.collection('admins');

    const existingAdmin = await adminCollection.findOne({ username: validatedData.username });
    if (existingAdmin) {
      return { success: false, message: 'Este nome de usuário já existe.' };
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12); // ✅ 12 rounds (segurança)

    // In the initial setup, we remove the temporary user placeholder if it exists.
    await adminCollection.deleteMany({ username: 'admin' });

    await adminCollection.insertOne({
      username: validatedData.username,
      password: hashedPassword,
    });

    return { success: true, message: 'Administrador inicial configurado com sucesso!' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors.map(e => e.message).join(', ') };
    }
    console.error('Erro ao configurar administrador inicial:', error);
    return { success: false, message: 'Ocorreu um erro inesperado.' };
  }
}


// Generic action to create new admins from the admin panel
export async function createAdmin(
  values: z.infer<typeof CreateAdminSchema>
): Promise<AdminActionResult> {
  try {
    const validatedData = CreateAdminSchema.parse(values);
    const client = await clientPromise;
    const db = client.db('vematize');
    const adminCollection = db.collection('admins');

    const existingAdmin = await adminCollection.findOne({ username: validatedData.username });
    if (existingAdmin) {
      return { success: false, message: 'Este nome de usuário já existe.' };
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12); // ✅ 12 rounds (segurança)

    await adminCollection.insertOne({
      username: validatedData.username,
      password: hashedPassword,
    });

    return { success: true, message: 'Administrador criado com sucesso!' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors.map(e => e.message).join(', ') };
    }
    console.error('Erro ao criar administrador:', error);
    return { success: false, message: 'Ocorreu um erro inesperado.' };
  }
}








interface Admin {
  _id: string;
  username: string;
}

// Fetch all admins (excluding sensitive data)
export async function getAdmins(): Promise<Admin[]> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const admins = await db.collection('admins').find({}, { projection: { password: 0 } }).toArray();

    // Convert _id to string and ensure username is present
    return admins.map(admin => ({
      _id: admin._id.toString(),
      username: admin.username as string,
    }));
  } catch (error) {
    console.error('Erro ao buscar administradores:', error);
    return [];
  }
}

// Delete an admin
export async function deleteAdmin(adminId: string): Promise<AdminActionResult> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const { ObjectId } = await import('mongodb');

    const result = await db.collection('admins').deleteOne({ _id: new ObjectId(adminId) });

    if (result.deletedCount === 0) {
      return { success: false, message: 'Administrador não encontrado.' };
    }

    return { success: true, message: 'Administrador removido com sucesso!' };
  } catch (error) {
    console.error('Erro ao remover administrador:', error);
    return { success: false, message: 'Erro ao remover administrador.' };
  }
}
