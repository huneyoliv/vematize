'use server';

import clientPromise from '@/lib/mongodb';
import { CouponSchema } from '@/lib/schemas';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getTenantFromSession } from '@/lib/auth/getTenantFromSession';

export async function getCoupons() {
    const tenant = await getTenantFromSession();
    if (!tenant) throw new Error('Unauthorized');

    const client = await clientPromise;
    const db = client.db('vematize');

    const coupons = await db.collection('coupons')
        .find({ tenantId: tenant._id.toString() })
        .sort({ createdAt: -1 })
        .toArray();

    return coupons.map(c => ({
        ...c,
        _id: c._id.toString(),
        expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : undefined,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt?.toISOString()
    }));
}

export async function createCoupon(data: any) {
    const tenant = await getTenantFromSession();
    if (!tenant) throw new Error('Unauthorized');

    const result = CouponSchema.safeParse({
        ...data,
        tenantId: tenant._id.toString()
    });

    if (!result.success) {
        return { success: false, error: result.error.errors[0].message };
    }

    const client = await clientPromise;
    const db = client.db('vematize');

    // Check if code already exists for this tenant
    const existing = await db.collection('coupons').findOne({
        tenantId: tenant._id.toString(),
        code: result.data.code
    });

    if (existing) {
        return { success: false, error: 'Já existe um cupom com este código.' };
    }

    await db.collection('coupons').insertOne({
        ...result.data,
        createdAt: new Date(),
        currentUses: 0,
        isActive: true
    });

    revalidatePath('/coupons');
    return { success: true };
}

export async function toggleCouponStatus(id: string, isActive: boolean) {
    const tenant = await getTenantFromSession();
    if (!tenant) throw new Error('Unauthorized');

    const client = await clientPromise;
    const db = client.db('vematize');

    await db.collection('coupons').updateOne(
        { _id: new ObjectId(id), tenantId: tenant._id.toString() },
        { $set: { isActive } }
    );

    revalidatePath('/coupons');
    return { success: true };
}

export async function deleteCoupon(id: string) {
    const tenant = await getTenantFromSession();
    if (!tenant) throw new Error('Unauthorized');

    const client = await clientPromise;
    const db = client.db('vematize');

    await db.collection('coupons').deleteOne({
        _id: new ObjectId(id),
        tenantId: tenant._id.toString()
    });

    revalidatePath('/coupons');
    return { success: true };
}

export async function getProducts() {
    const tenant = await getTenantFromSession();
    if (!tenant) throw new Error('Unauthorized');

    const client = await clientPromise;
    const db = client.db('vematize');

    const products = await db.collection('products')
        .find({ tenantId: tenant._id.toString() })
        .project({ _id: 1, name: 1 })
        .toArray();

    return products.map(p => ({
        id: p._id.toString(),
        name: p.name
    }));
}
