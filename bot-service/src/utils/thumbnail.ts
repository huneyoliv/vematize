import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs';
import logger from './logger';

// Configure ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

interface ThumbnailResult {
    success: boolean;
    thumbnailPath?: string; // Relative path for DB/URL
    fullPath?: string; // Absolute path for filesystem
    error?: any;
}

/**
 * Generates a thumbnail for an image or video file.
 * @param filePath Absolute path to the source file
 * @param outputDir Absolute path to the directory where thumbnail should be saved
 * @param filename Original filename (used to generate thumbnail filename)
 * @param mimeType MIME type of the file
 */
export async function generateThumbnail(
    filePath: string,
    outputDir: string,
    filename: string,
    mimeType: string
): Promise<ThumbnailResult> {
    try {
        const thumbnailFilename = `thumb_${path.basename(filename, path.extname(filename))}.jpg`;
        const thumbnailPath = path.join(outputDir, thumbnailFilename);

        // Ensure output directory exists (it should, but safety first)
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        if (mimeType.startsWith('image/')) {
            await sharp(filePath)
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
        } else if (mimeType.startsWith('video/')) {
            return new Promise((resolve) => {
                const tempScreenshot = path.join(outputDir, `temp_${thumbnailFilename}`);

                ffmpeg(filePath)
                    .screenshots({
                        timestamps: ['10%'],
                        filename: `temp_${thumbnailFilename}`,
                        folder: outputDir,
                        // Remove size constraint to get original aspect ratio
                    })
                    .on('end', async () => {
                        try {
                            // Process the screenshot with sharp to match image behavior
                            await sharp(tempScreenshot)
                                .resize(300, 300, {
                                    fit: 'cover',
                                    position: 'center'
                                })
                                .jpeg({ quality: 80 })
                                .toFile(thumbnailPath);

                            // Clean up temp file
                            if (fs.existsSync(tempScreenshot)) {
                                fs.unlinkSync(tempScreenshot);
                            }

                            resolve({
                                success: true,
                                thumbnailPath: thumbnailFilename,
                                fullPath: thumbnailPath
                            });
                        } catch (err) {
                            logger.error('Error processing video thumbnail with sharp:', err);
                            resolve({ success: false, error: err });
                        }
                    })
                    .on('error', (err) => {
                        logger.error('Error generating video thumbnail:', err);
                        resolve({
                            success: false,
                            error: err
                        });
                    });
            });
        }

        return { success: false, error: 'Unsupported file type for thumbnail' };

    } catch (error) {
        logger.error('Thumbnail generation error:', error);
        return { success: false, error };
    }
}
