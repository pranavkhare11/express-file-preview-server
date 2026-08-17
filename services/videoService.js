const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const { uploadToDrive } = require('./driveService');

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

function drawProgressBar(percent, filename) {
    const totalBars = 20;
    const clampedPercent = Math.min(100, Math.max(0, percent));
    const filledBars = Math.round((clampedPercent / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    const barStr = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
    const formattedPercent = clampedPercent.toFixed(1);

    process.stdout.write(`\r⚙️ [TRANSCODING] ${filename} [${barStr}] ${formattedPercent}%`);
    if (clampedPercent >= 100) process.stdout.write('\n');
}

function runFFmpegCommand(inputPath, outputPath, outputOptions, fileDoc) {
    return new Promise((resolve, reject) => {
        let lastSavedProgress = 0;

        ffmpeg(inputPath)
            .outputOptions(outputOptions)
            .toFormat('mp4')
            .on('progress', async (progress) => {
                const percent = Math.min(100, Math.max(0, progress.percent || 0));
                drawProgressBar(percent, fileDoc.originalName);

                if (Math.abs(percent - lastSavedProgress) >= 5 || percent >= 100) {
                    lastSavedProgress = percent;
                    const roundedProgress = Math.round(percent);
                    await File.findByIdAndUpdate(fileDoc._id, { progress: roundedProgress });

                    try {
                        const { broadcastSystemState } = require('./sessionService');
                        await broadcastSystemState('FILE_PROGRESS', {
                            fileId: fileDoc._id,
                            userId: fileDoc.userId,
                            originalName: fileDoc.originalName,
                            progress: roundedProgress
                        });
                    } catch (e) { }
                }
            })
            .on('end', () => resolve(true))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
}

/**
 * Transcodes video locally using FFmpeg, uploads optimized video to Google Drive, and cleans up local temp files.
 * 
 * @param {Object} fileDoc Mongoose File document
 * @param {string} tempInputPath Local temporary file path for the raw video
 */
async function processVideo(fileDoc, tempInputPath) {
    try {
        await File.findByIdAndUpdate(fileDoc._id, { status: 'processing', progress: 0 });

        const tempDir = path.dirname(tempInputPath);
        const outputFilename = `fast_${path.parse(fileDoc.filename).name}.mp4`;
        const outputPath = path.join(tempDir, outputFilename);

        console.log(`🎬 [VIDEO TRANSCODER START] Processing video: ${fileDoc.originalName}`);

        let success = false;

        try {
            console.log(`⚡ [FAST REMUX] Attempting zero-reencode faststart copy for ${fileDoc.originalName}...`);
            await runFFmpegCommand(tempInputPath, outputPath, [
                '-c copy',
                '-movflags +faststart'
            ], fileDoc);
            success = true;
        } catch (fastCopyErr) {
            console.log(`⚠️ [FAST REMUX SKIPPED] Stream copy unsuited, switching to ultrafast transcoding: ${fastCopyErr.message}`);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            await runFFmpegCommand(tempInputPath, outputPath, [
                '-c:v libx264',
                '-c:a aac',
                '-movflags +faststart',
                '-preset ultrafast'
            ], fileDoc);
            success = true;
        }

        if (success) {
            drawProgressBar(100, fileDoc.originalName);
            console.log(`\n📤 [UPLOADING TO DRIVE] Uploading optimized video to Google Drive: ${fileDoc.originalName}`);

            // Upload the optimized video stream to Google Drive inside user's folder
            const videoStream = fs.createReadStream(outputPath);
            const driveUpload = await uploadToDrive(videoStream, fileDoc.filename, 'video/mp4', fileDoc.userId);

            console.log(`\n✅ [VIDEO TRANSCODER SUCCESS] Uploaded to Drive with ID: ${driveUpload.driveFileId}`);

            // Clean up temporary local files
            if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

            // Update database record with driveFileId & ready status
            await File.findByIdAndUpdate(fileDoc._id, {
                driveFileId: driveUpload.driveFileId,
                mimeType: 'video/mp4',
                size: driveUpload.size,
                status: 'ready',
                progress: 100,
                path: undefined
            });

            try {
                const { broadcastSystemState } = require('./sessionService');
                await broadcastSystemState('FILE_READY', {
                    fileId: fileDoc._id,
                    userId: fileDoc.userId,
                    originalName: fileDoc.originalName
                });
            } catch (e) { }
        }

    } catch (err) {
        console.error(`\n❌ [VIDEO TRANSCODER ERROR] Failed processing ${fileDoc.originalName}:`, err.message);

        // Cleanup temp file on error
        if (tempInputPath && fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);

        await File.findByIdAndUpdate(fileDoc._id, { status: 'failed' });
    }
}

module.exports = { processVideo };
