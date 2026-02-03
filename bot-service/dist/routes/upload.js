"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mongodb_1 = require("mongodb");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const zod_1 = require("zod");
const thumbnail_1 = require("../utils/thumbnail");
const router = express_1.default.Router();
// Configure Multer Storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const tenantId = req.body.tenantId;
        const context = req.body.context || 'other';
        if (!tenantId) {
            return cb(new Error('Tenant ID required'), '');
        }
        // Directory structure: public/medias/[tenantId]/[context]/
        // We go up two levels from src/routes to root, then into public
        const uploadDir = path_1.default.join(process.cwd(), 'public', 'medias', tenantId, context);
        fs_1.default.mkdir(uploadDir, { recursive: true }, (err) => {
            if (err)
                return cb(err, '');
            cb(null, uploadDir);
        });
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeFilename = file.originalname.replace(/\s+/g, '_');
        cb(null, `${uniqueSuffix}-${safeFilename}`);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});
// Validation Schema
const UploadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().refine((val) => mongodb_1.ObjectId.isValid(val), { message: "Invalid Tenant ID" }),
    context: zod_1.z.string().optional(),
});
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const validation = UploadSchema.safeParse(req.body);
        if (!validation.success) {
            // Clean up uploaded file if validation fails
            fs_1.default.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Invalid parameters', details: validation.error.errors });
        }
        const { tenantId, context } = validation.data;
        const db = (await database_1.default).db('vematize');
        // Verify tenant exists (optional but recommended)
        const tenant = await db.collection('tenants').findOne({ _id: new mongodb_1.ObjectId(tenantId) });
        if (!tenant) {
            fs_1.default.unlinkSync(req.file.path);
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
            const outputDir = path_1.default.dirname(req.file.path);
            const thumbResult = await (0, thumbnail_1.generateThumbnail)(req.file.path, outputDir, req.file.filename, req.file.mimetype);
            if (thumbResult.success && thumbResult.thumbnailPath) {
                thumbnailUrl = `/medias/${tenantId}/${context || 'other'}/${thumbResult.thumbnailPath}`;
            }
        }
        const uploadDoc = {
            _id: new mongodb_1.ObjectId(),
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
        logger_1.default.info(`File uploaded: ${relativePath} for tenant ${tenantId}`);
        res.json({
            success: true,
            file: {
                ...uploadDoc,
                _id: uploadDoc._id.toString()
            }
        });
    }
    catch (error) {
        logger_1.default.error('Upload error:', error);
        if (req.file) {
            fs_1.default.unlink(req.file.path, () => { }); // Try to clean up
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Delete Endpoint
router.delete('/:uploadId', async (req, res) => {
    try {
        const { uploadId } = req.params;
        const { tenantId } = req.body; // Pass tenantId in body for verification
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        const db = (await database_1.default).db('vematize');
        const upload = await db.collection('uploads').findOne({
            _id: new mongodb_1.ObjectId(uploadId),
            tenantId
        });
        if (!upload) {
            return res.status(404).json({ error: 'Upload not found' });
        }
        // Delete from filesystem
        const absolutePath = path_1.default.join(process.cwd(), 'public', upload.url);
        logger_1.default.info(`Attempting to delete file: ${absolutePath}`);
        fs_1.default.unlink(absolutePath, (err) => {
            if (err)
                logger_1.default.error(`Failed to delete file ${absolutePath}:`, err);
            else
                logger_1.default.info(`Successfully deleted file: ${absolutePath}`);
        });
        // Delete thumbnail if exists
        if (upload.thumbnailUrl) {
            const absoluteThumbPath = path_1.default.join(process.cwd(), 'public', upload.thumbnailUrl);
            logger_1.default.info(`Attempting to delete thumbnail: ${absoluteThumbPath}`);
            fs_1.default.unlink(absoluteThumbPath, (err) => {
                if (err)
                    logger_1.default.error(`Failed to delete thumbnail ${absoluteThumbPath}:`, err);
                else
                    logger_1.default.info(`Successfully deleted thumbnail: ${absoluteThumbPath}`);
            });
        }
        else {
            logger_1.default.info('No thumbnail URL found for this upload.');
        }
        await db.collection('uploads').deleteOne({ _id: new mongodb_1.ObjectId(uploadId) });
        logger_1.default.info(`File deleted: ${upload.url} for tenant ${tenantId}`);
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error('Delete error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
