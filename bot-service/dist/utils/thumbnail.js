"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateThumbnail = generateThumbnail;
const sharp_1 = __importDefault(require("sharp"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("./logger"));
// Configure ffmpeg path
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.default.path);
/**
 * Generates a thumbnail for an image or video file.
 * @param filePath Absolute path to the source file
 * @param outputDir Absolute path to the directory where thumbnail should be saved
 * @param filename Original filename (used to generate thumbnail filename)
 * @param mimeType MIME type of the file
 */
async function generateThumbnail(filePath, outputDir, filename, mimeType) {
    try {
        const thumbnailFilename = `thumb_${path_1.default.basename(filename, path_1.default.extname(filename))}.jpg`;
        const thumbnailPath = path_1.default.join(outputDir, thumbnailFilename);
        // Ensure output directory exists (it should, but safety first)
        if (!fs_1.default.existsSync(outputDir)) {
            fs_1.default.mkdirSync(outputDir, { recursive: true });
        }
        if (mimeType.startsWith('image/')) {
            await (0, sharp_1.default)(filePath)
                .resize(300, 300, {
                fit: 'cover',
                position: 'center'
            })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);
            return {
                success: true,
                thumbnailPath: thumbnailFilename,
                fullPath: thumbnailPath
            };
        }
        else if (mimeType.startsWith('video/')) {
            return new Promise((resolve) => {
                const tempScreenshot = path_1.default.join(outputDir, `temp_${thumbnailFilename}`);
                (0, fluent_ffmpeg_1.default)(filePath)
                    .screenshots({
                    timestamps: ['10%'],
                    filename: `temp_${thumbnailFilename}`,
                    folder: outputDir,
                    // Remove size constraint to get original aspect ratio
                })
                    .on('end', async () => {
                    try {
                        // Process the screenshot with sharp to match image behavior
                        await (0, sharp_1.default)(tempScreenshot)
                            .resize(300, 300, {
                            fit: 'cover',
                            position: 'center'
                        })
                            .jpeg({ quality: 80 })
                            .toFile(thumbnailPath);
                        // Clean up temp file
                        if (fs_1.default.existsSync(tempScreenshot)) {
                            fs_1.default.unlinkSync(tempScreenshot);
                        }
                        resolve({
                            success: true,
                            thumbnailPath: thumbnailFilename,
                            fullPath: thumbnailPath
                        });
                    }
                    catch (err) {
                        logger_1.default.error('Error processing video thumbnail with sharp:', err);
                        resolve({ success: false, error: err });
                    }
                })
                    .on('error', (err) => {
                    logger_1.default.error('Error generating video thumbnail:', err);
                    resolve({
                        success: false,
                        error: err
                    });
                });
            });
        }
        return { success: false, error: 'Unsupported file type for thumbnail' };
    }
    catch (error) {
        logger_1.default.error('Thumbnail generation error:', error);
        return { success: false, error };
    }
}
