'use server';

import clientPromise from '@/lib/mongodb';
import { CouponSchema } from '@/lib/schemas';
import type { Coupon } from '@/lib/types';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

type ActionResult = {
  success: boolean;
  message: string;
  data?: any;
};

/**
 * Busca todos os cupons
 * 
 * 🔒 SERIALIZAÇÃO: Converte _id do MongoDB para string para compatibilidade
 * com Client Components do Next.js
 */
export async function getCoupons(): Promise<Coupon[]> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const couponsCollection = db.collection<Coupon>('coupons');

    const coupons = await couponsCollection.find({}).sort({ createdAt: -1 }).toArray();

    // ✅ Serializa objetos MongoDB para plain objects
    return coupons.map((coupon: any) => ({
      ...coupon,
      _id: coupon._id.toString(), // Converte ObjectId para string
      id: coupon._id.toString(), // Adiciona campo 'id' para compatibilidade
      // ✅ Verifica se é Date antes de chamar toISOString()
      expiresAt: coupon.expiresAt
        ? (coupon.expiresAt instanceof Date ? coupon.expiresAt.toISOString() : coupon.expiresAt)
        : undefined,
      createdAt: coupon.createdAt
        ? (coupon.createdAt instanceof Date ? coupon.createdAt.toISOString() : coupon.createdAt)
        : undefined,
    }));
  } catch (error) {
    console.error('Database error fetching coupons:', error);
    return [];
  }
}

/**
 * Busca um cupom pelo código
 */
export async function getCouponByCode(code: string): Promise<{ success: boolean; coupon?: Coupon; message?: string }> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const couponsCollection = db.collection<Coupon>('coupons');

    const coupon = await couponsCollection.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return { success: false, message: 'Cupom não encontrado.' };
    }

    // Verifica se o cupom está ativo
    if (!coupon.isActive) {
      return { success: false, message: 'Este cupom não está mais ativo.' };
    }

    // Verifica se o cupom expirou
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { success: false, message: 'Este cupom expirou.' };
    }

    // Verifica se atingiu o limite de usos
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return { success: false, message: 'Este cupom atingiu o limite de usos.' };
    }

    return { success: true, coupon };
  } catch (error) {
    console.error('Error fetching coupon by code:', error);
    return { success: false, message: 'Erro ao buscar cupom.' };
  }
}

/**
 * Valida e aplica um cupom a um plano
 */
export async function validateCoupon(
  code: string,
  planId: string
): Promise<{ success: boolean; discount?: { type: string; value: number }; message?: string }> {
  try {
    const result = await getCouponByCode(code);

    if (!result.success || !result.coupon) {
      return { success: false, message: result.message };
    }

    const coupon = result.coupon;

    // Verifica se o cupom é aplicável ao plano
    if (coupon.applicablePlans && coupon.applicablePlans.length > 0) {
      if (!coupon.applicablePlans.includes(planId)) {
        return { success: false, message: 'Este cupom não é válido para este plano.' };
      }
    }

    return {
      success: true,
      discount: {
        type: coupon.type,
        value: coupon.value
      }
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return { success: false, message: 'Erro ao validar cupom.' };
  }
}

/**
 * Incrementa o contador de uso de um cupom
 */
export async function incrementCouponUse(code: string): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const couponsCollection = db.collection<Coupon>('coupons');

    await couponsCollection.updateOne(
      { code: code.toUpperCase() },
      {
        $inc: { currentUses: 1 },
        $set: { updatedAt: new Date() }
      }
    );
  } catch (error) {
    console.error('Error incrementing coupon use:', error);
  }
}

/**
 * Salva ou atualiza um cupom
 */
export async function saveCoupon(formData: FormData, adminId: string): Promise<ActionResult> {
  try {
    // Helper para converter null em undefined
    const getStringOrUndefined = (key: string): string | undefined => {
      const value = formData.get(key);
      return value && value !== '' ? String(value) : undefined;
    };

    const rawData = {
      id: getStringOrUndefined('id'),
      code: (formData.get('code') as string || '').toUpperCase(),
      type: formData.get('type') as string,
      value: parseFloat(formData.get('value') as string),
      description: getStringOrUndefined('description'),
      maxUses: formData.get('maxUses') ? parseInt(formData.get('maxUses') as string) : undefined,
      expiresAt: getStringOrUndefined('expiresAt'),
      isActive: formData.get('isActive') === 'true',
      applicablePlans: formData.get('applicablePlans') ? JSON.parse(formData.get('applicablePlans') as string) : undefined,
      durationType: formData.get('durationType') as string || 'forever',
      durationMonths: formData.get('durationMonths') ? parseInt(formData.get('durationMonths') as string) : undefined,
    };

    const validatedData = CouponSchema.parse(rawData);
    const { id, ...couponData } = validatedData;

    const client = await clientPromise;
    const db = client.db('vematize');
    const couponsCollection = db.collection<Coupon>('coupons');

    if (id) {
      // Atualizar cupom existente
      const result = await couponsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...couponData,
            // ✅ Converte expiresAt para Date se for string
            expiresAt: (couponData.expiresAt ? new Date(couponData.expiresAt) : undefined) as any,
            updatedAt: new Date()
          }
        }
      );

      if (!result.matchedCount) {
        throw new Error('Cupom não encontrado.');
      }
    } else {
      // Verificar se o código já existe
      const existing = await couponsCollection.findOne({ code: couponData.code });
      if (existing) {
        return { success: false, message: 'Já existe um cupom com este código.' };
      }

      // Criar novo cupom
      await couponsCollection.insertOne({
        _id: new ObjectId(),
        ...couponData,
        currentUses: 0,
        // ✅ Converte expiresAt para Date se for string
        expiresAt: (couponData.expiresAt ? new Date(couponData.expiresAt) : undefined) as any,
        createdAt: new Date(),
        createdBy: adminId
      } as Coupon);
    }

    revalidatePath('/admins/coupons'); // ✅ Atualizado
    return { success: true, message: 'Cupom salvo com sucesso!' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors.map(e => e.message).join(', ') };
    }
    console.error('Error saving coupon:', error);
    const message = error instanceof Error ? error.message : 'Erro ao salvar o cupom.';
    return { success: false, message };
  }
}

/**
 * Deleta um cupom
 */
export async function deleteCoupon(id: string): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, message: 'ID do cupom não fornecido.' };
    }
    const client = await clientPromise;
    const db = client.db('vematize');
    const couponsCollection = db.collection('coupons');

    const result = await couponsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return { success: false, message: 'Cupom não encontrado.' };
    }

    revalidatePath('/admins/coupons'); // ✅ Atualizado
    return { success: true, message: 'Cupom excluído com sucesso!' };

  } catch (error) {
    console.error('Failed to delete coupon:', error);
    return { success: false, message: 'Ocorreu um erro inesperado ao excluir o cupom.' };
  }
}

/**
 * Alterna o status ativo/inativo de um cupom
 */
export async function toggleCouponStatus(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const client = await clientPromise;
    const db = client.db('vematize');
    const couponsCollection = db.collection('coupons');

    const result = await couponsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isActive,
          updatedAt: new Date()
        }
      }
    );

    if (!result.matchedCount) {
      return { success: false, message: 'Cupom não encontrado.' };
    }

    revalidatePath('/admins/coupons'); // ✅ Atualizado
    return { success: true, message: `Cupom ${isActive ? 'ativado' : 'desativado'} com sucesso!` };
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    return { success: false, message: 'Erro ao alterar status do cupom.' };
  }
}
