import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import logger from '../utils/logger';

// Configure ffmpeg/ffprobe paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const router = express.Router();

router.post('/info', async (req: Request, res: Response) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Convert URL to file path
        // URL is like /medias/tenantId/context/filename
        // File path is process.cwd() + public + url
        const relativePath = url.startsWith('/') ? url : `/${url}`;
        const filePath = path.join(process.cwd(), 'public', relativePath);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Get metadata
        const metadata: any = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata);
            });
        });

        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        const width = videoStream?.width;
        const height = videoStream?.height;
        const duration = metadata.format.duration;

        // Generate temporary thumbnail
        const filename = path.basename(filePath);
        const dir = path.dirname(filePath);
        const tempThumbName = `temp_thumb_${Date.now()}_${filename}.jpg`;
        const tempThumbPath = path.join(dir, tempThumbName);

        await new Promise((resolve, reject) => {
            ffmpeg(filePath)
                .screenshots({
                    timestamps: ['10%'],
                    filename: tempThumbName,
                    folder: dir,
                    // No size constraint to keep original resolution
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Schedule deletion after 5 minutes
        setTimeout(() => {
            if (fs.existsSync(tempThumbPath)) {
                fs.unlink(tempThumbPath, (err) => {
                    if (err) logger.error('Error deleting temp thumbnail:', err);
                });
            }
        }, 5 * 60 * 1000);

        const thumbUrl = path.join(path.dirname(relativePath), tempThumbName);

        res.json({
            width,
            height,
            duration,
            thumbnailUrl: thumbUrl
        });

    } catch (error) {
        logger.error('Error getting media info:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
