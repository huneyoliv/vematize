"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
const ffprobe_1 = __importDefault(require("@ffprobe-installer/ffprobe"));
const logger_1 = __importDefault(require("../utils/logger"));
// Configure ffmpeg/ffprobe paths
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.default.path);
fluent_ffmpeg_1.default.setFfprobePath(ffprobe_1.default.path);
const router = express_1.default.Router();
router.post('/info', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        // Convert URL to file path
        // URL is like /medias/tenantId/context/filename
        // File path is process.cwd() + public + url
        const relativePath = url.startsWith('/') ? url : `/${url}`;
        const filePath = path_1.default.join(process.cwd(), 'public', relativePath);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Get metadata
        const metadata = await new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                if (err)
                    reject(err);
                else
                    resolve(metadata);
            });
        });
        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        const width = videoStream?.width;
        const height = videoStream?.height;
        const duration = metadata.format.duration;
        // Generate temporary thumbnail
        const filename = path_1.default.basename(filePath);
        const dir = path_1.default.dirname(filePath);
        const tempThumbName = `temp_thumb_${Date.now()}_${filename}.jpg`;
        const tempThumbPath = path_1.default.join(dir, tempThumbName);
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(filePath)
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
            if (fs_1.default.existsSync(tempThumbPath)) {
                fs_1.default.unlink(tempThumbPath, (err) => {
                    if (err)
                        logger_1.default.error('Error deleting temp thumbnail:', err);
                });
            }
        }, 5 * 60 * 1000);
        const thumbUrl = path_1.default.join(path_1.default.dirname(relativePath), tempThumbName);
        res.json({
            width,
            height,
            duration,
            thumbnailUrl: thumbUrl
        });
    }
    catch (error) {
        logger_1.default.error('Error getting media info:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
