import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import clientPromise from '../config/database';
import logger from '../utils/logger';
import { z } from 'zod';
import { generateThumbnail } from '../utils/thumbnail';

const router = express.Router();

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tenantId = req.body.tenantId;
        const context = req.body.context || 'other';

        if (!tenantId) {
            return cb(new Error('Tenant ID required'), '');
        }

        // Directory structure: public/medias/[tenantId]/[context]/
        // We go up two levels from src/routes to root, then into public
        const uploadDir = path.join(process.cwd(), 'public', 'medias', tenantId, context);

        fs.mkdir(uploadDir, { recursive: true }, (err) => {
            if (err) return cb(err, '');
            cb(null, uploadDir);
        });
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeFilename = file.originalname.replace(/\s+/g, '_');
        cb(null, `${uniqueSuffix}-${safeFilename}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Validation Schema
const UploadSchema = z.object({
    tenantId: z.string().refine((val) => ObjectId.isValid(val), { message: "Invalid Tenant ID" }),
    context: z.string().optional(),
});

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const validation = UploadSchema.safeParse(req.body);
        if (!validation.success) {
            // Clean up uploaded file if validation fails
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Invalid parameters', details: validation.error.errors });
        }

        const { tenantId, context } = validation.data;
        const db = (await clientPromise).db('vematize');

        // Verify tenant exists (optional but recommended)
        const tenant = await db.collection('tenants').findOne({ _id: new ObjectId(tenantId) });
        if (!tenant) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Tenant not found' });
        }

        // Construct Public URL
        // Assuming the bot service serves static files from /public
        // The URL should be relative to the domain root if served via Nginx or similar,
        // or absolute if we want to be explicit.
        // For now, let's return the relative path that can be appended to the base URL.
        const relativePath = `/medias/${tenantId}/${context || 'other'}/${req.file.filename}`;

        // Generate Thumbnail
        let thumbnailUrl = null;
        if (req.file.mimetype.startsWith('image/') || req.file.mimetype.startsWith('video/')) {
            const outputDir = path.dirname(req.file.path);
            const thumbResult = await generateThumbnail(
                req.file.path,
                outputDir,
                req.file.filename,
                req.file.mimetype
            );

            if (thumbResult.success && thumbResult.thumbnailPath) {
                thumbnailUrl = `/medias/${tenantId}/${context || 'other'}/${thumbResult.thumbnailPath}`;
            }
        }

        const uploadDoc = {
            _id: new ObjectId(),
            tenantId,
            originalName: req.file.originalname,
            fileName: req.file.filename,
            mimeType: req.file.mimetype,
            size: req.file.size,
            url: relativePath,
            thumbnailUrl, // Add thumbnail URL
            context: context || 'other',
            createdAt: new Date()
        };

        await db.collection('uploads').insertOne(uploadDoc);

        logger.info(`File uploaded: ${relativePath} for tenant ${tenantId}`);

        res.json({
            success: true,
            file: {
                ...uploadDoc,
                _id: uploadDoc._id.toString()
            }
        });

    } catch (error) {
        logger.error('Upload error:', error);
        if (req.file) {
            fs.unlink(req.file.path, () => { }); // Try to clean up
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete Endpoint
router.delete('/:uploadId', async (req: Request, res: Response) => {
    try {
        const { uploadId } = req.params;
        const { tenantId } = req.body; // Pass tenantId in body for verification

        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }

        const db = (await clientPromise).db('vematize');
        const upload = await db.collection('uploads').findOne({
            _id: new ObjectId(uploadId),
            tenantId
        });

        if (!upload) {
            return res.status(404).json({ error: 'Upload not found' });
        }

        // Delete from filesystem
        const absolutePath = path.join(process.cwd(), 'public', upload.url);
        logger.info(`Attempting to delete file: ${absolutePath}`);

        fs.unlink(absolutePath, (err) => {
            if (err) logger.error(`Failed to delete file ${absolutePath}:`, err);
            else logger.info(`Successfully deleted file: ${absolutePath}`);
        });

        // Delete thumbnail if exists
        if (upload.thumbnailUrl) {
            const absoluteThumbPath = path.join(process.cwd(), 'public', upload.thumbnailUrl);
            logger.info(`Attempting to delete thumbnail: ${absoluteThumbPath}`);

            fs.unlink(absoluteThumbPath, (err) => {
                if (err) logger.error(`Failed to delete thumbnail ${absoluteThumbPath}:`, err);
                else logger.info(`Successfully deleted thumbnail: ${absoluteThumbPath}`);
            });
        } else {
            logger.info('No thumbnail URL found for this upload.');
        }

        await db.collection('uploads').deleteOne({ _id: new ObjectId(uploadId) });

        logger.info(`File deleted: ${upload.url} for tenant ${tenantId}`);

        res.json({ success: true });

    } catch (error) {
        logger.error('Delete error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
