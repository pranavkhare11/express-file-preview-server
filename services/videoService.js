const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');

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

async function processVideo(fileDoc) {
    const isVideo = fileDoc.mimeType.startsWith('video/') ||
        ['.mp4', '.mov', '.mkv', '.webm', '.mpeg', '.avi'].some(ext => fileDoc.filename.toLowerCase().endsWith(ext));

    if (!isVideo) return;

    try {
        await File.findByIdAndUpdate(fileDoc._id, { status: 'processing', progress: 0 });

        const inputPath = fileDoc.path;
        const dir = path.dirname(inputPath);
        const outputFilename = `fast_${path.parse(fileDoc.filename).name}.mp4`;
        const outputPath = path.join(dir, outputFilename);

        console.log(`🎬 [VIDEO TRANSCODER START] Processing video: ${fileDoc.originalName}`);

        let success = false;

        try {
            console.log(`⚡ [FAST REMUX] Attempting zero-reencode faststart copy for ${fileDoc.originalName}...`);
            await runFFmpegCommand(inputPath, outputPath, [
                '-c copy',
                '-movflags +faststart'
            ], fileDoc);
            success = true;
        } catch (fastCopyErr) {
            console.log(`⚠️ [FAST REMUX SKIPPED] Stream copy unsuited, switching to ultrafast transcoding: ${fastCopyErr.message}`);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            await runFFmpegCommand(inputPath, outputPath, [
                '-c:v libx264',
                '-c:a aac',
                '-movflags +faststart',
                '-preset ultrafast'
            ], fileDoc);
            success = true;
        }

        if (success) {
            drawProgressBar(100, fileDoc.originalName);
            console.log(`\n✅ [VIDEO TRANSCODER SUCCESS] Fast-start MP4 ready: ${fileDoc.originalName}`);

            if (fs.existsSync(inputPath) && inputPath !== outputPath) {
                fs.unlinkSync(inputPath);
            }

            const stats = fs.statSync(outputPath);

            await File.findByIdAndUpdate(fileDoc._id, {
                filename: outputFilename,
                path: outputPath,
                mimeType: 'video/mp4',
                size: stats.size,
                status: 'ready',
                progress: 100
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
        await File.findByIdAndUpdate(fileDoc._id, { status: 'failed' });
    }
}

module.exports = { processVideo };
