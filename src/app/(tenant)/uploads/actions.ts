'use server';

import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Upload } from '@/lib/types';
import { unlink } from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';

export async function getUploads(tenantId: string) {
    console.log('getUploads called with tenantId:', tenantId);
    const db = (await clientPromise).db('vematize');

    let query: any = { tenantId: tenantId };
    try {
        query = {
            $or: [
                { tenantId: tenantId },
                { tenantId: new ObjectId(tenantId) }
            ]
        };
    } catch (e) {
        // tenantId might not be a valid ObjectId
        query = { tenantId: tenantId };
    }

    const uploads = await db.collection<Upload>('uploads')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
    console.log('getUploads found:', uploads.length, 'uploads');

    // Convert ObjectIds to strings for serialization if needed, or return as is if using client components that handle it.
    // Usually better to map to plain objects.
    return uploads.map(u => ({
        ...u,
        _id: u._id.toString(),
        createdAt: u.createdAt.toISOString()
    }));
}

export async function deleteUpload(uploadId: string, tenantId: string) {
    // Use private env var or default to localhost
    const botServiceUrl = process.env.BOT_SERVICE_URL || 'http://localhost:8080';

    try {
        const response = await fetch(`${botServiceUrl}/api/v1/upload/${uploadId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tenantId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, message: errorData.error || 'Failed to delete upload' };
        }

        revalidatePath('/uploads');
        return { success: true };
    } catch (error) {
        console.error('Error deleting upload via API:', error);
        return { success: false, message: 'Internal Server Error' };
    }
}

export async function uploadFile(formData: FormData) {
    const botServiceUrl = process.env.BOT_SERVICE_URL || 'http://localhost:8080';

    try {
        const response = await fetch(`${botServiceUrl}/api/v1/upload`, {
            method: 'POST',
            body: formData,
            // fetch automatically sets the Content-Type to multipart/form-data with the boundary when body is FormData
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || 'Erro ao fazer upload' };
        }

        // Return the full URL using the public base URL if needed, or just the path
        // The frontend expects the full URL.
        // We can construct it here or let the frontend do it, but the frontend shouldn't know the bot service URL.
        // However, the file URL returned by bot-service might be relative or absolute.
        // If it's relative, we need to prepend something.
        // But wait, if we want to hide the bot service URL, we should probably proxy the file download too?
        // Or maybe the file URL is a public URL (e.g. S3 or static serve).
        // If it's static serve from bot-service, the frontend needs to know where to get it.
        // If we want to hide bot-service URL completely, we'd need a Next.js rewrite or proxy route.
        // For now, let's assume we return the URL as is, but maybe we can use a proxy path.

        // Let's check what bot-service returns. It returns `file: { url: ... }`.
        // If we return `${botServiceUrl}${data.file.url}`, we are exposing the bot service URL.
        // But if the user wants to avoid env vars in frontend, we can pass the full URL from here.

        const fullUrl = `${botServiceUrl}${data.file.url}`;
        return { success: true, file: { ...data.file, url: fullUrl } };

    } catch (error: any) {
        console.error('Upload error:', error);
        return { success: false, error: error.message || 'Erro interno no upload' };
    }
}
