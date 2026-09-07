const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const File = require('../file.model');
const { uploadToDrive } = require('./drive.service');
const { broadcastSystemState } = require('../../../services/sessionService');

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

const transcodeQueue = [];
let activeTranscodes = 0;
const MAX_CONCURRENT_TRANSCODES = 2;

const drawProgressBar = (percent, filename) => {
    const totalBars = 20;
    const clampedPercent = Math.min(100, Math.max(0, percent));
    const filledBars = Math.round((clampedPercent / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    const barStr = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
    const formattedPercent = clampedPercent.toFixed(1);

    process.stdout.write(`\r⚙️ [TRANSCODING] ${filename} [${barStr}] ${formattedPercent}%`);
    if (clampedPercent >= 100) process.stdout.write('\n');
};

const runFFmpegCommand = (inputPath, outputPath, outputOptions, fileDoc) => {
    return new Promise((resolve, reject) => {
        let lastSavedProgress = 0;

        ffmpeg(inputPath)
            .outputOptions(outputOptions)
            .toFormat('mp4')
            .on('progress', async (progress) => {
                const percent = Math.min(100, Math.max(0, progress.percent || 0));
                const roundedProgress = Math.round(percent);
                drawProgressBar(percent, fileDoc.originalName);

                if (Math.abs(roundedProgress - lastSavedProgress) >= 5 || roundedProgress === 100) {
                    lastSavedProgress = roundedProgress;
                    await File.findByIdAndUpdate(fileDoc._id, { progress: roundedProgress }).catch(() => {});

                    await broadcastSystemState('FILE_PROGRESS', {
                        fileId: fileDoc._id,
                        userId: fileDoc.userId,
                        originalName: fileDoc.originalName,
                        progress: roundedProgress
                    }).catch(() => {});
                }
            })
            .on('end', () => resolve(true))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
};

const processVideo = async (fileDoc, tempInputPath) => {
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

            const videoStream = fs.createReadStream(outputPath);
            const driveUpload = await uploadToDrive(videoStream, fileDoc.filename, 'video/mp4', fileDoc.userId);

            console.log(`\n✅ [VIDEO TRANSCODER SUCCESS] Uploaded to Drive with ID: ${driveUpload.driveFileId}`);

            if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

            await File.findByIdAndUpdate(fileDoc._id, {
                driveFileId: driveUpload.driveFileId,
                mimeType: 'video/mp4',
                size: driveUpload.size,
                status: 'ready',
                progress: 100,
                path: undefined
            });

            try {
                await broadcastSystemState('FILE_READY', {
                    fileId: fileDoc._id,
                    userId: fileDoc.userId,
                    originalName: fileDoc.originalName
                });
            } catch (e) { }
        }

    } catch (err) {
        console.error(`\n❌ [VIDEO TRANSCODER ERROR] Failed processing ${fileDoc.originalName}:`, err.message);

        if (tempInputPath && fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);

        await File.findByIdAndUpdate(fileDoc._id, { status: 'failed' });
    }
};

const enqueueTranscode = (fileDoc, tempInputPath) => {
    transcodeQueue.push({ fileDoc, tempInputPath });
    processNextTranscode();
};

const processNextTranscode = async () => {
    if (activeTranscodes >= MAX_CONCURRENT_TRANSCODES || transcodeQueue.length === 0) {
        return;
    }

    activeTranscodes++;
    const task = transcodeQueue.shift();

    try {
        await processVideo(task.fileDoc, task.tempInputPath);
    } catch (err) {
        console.error("❌ Queue Transcode Error:", err);
    } finally {
        activeTranscodes--;
        processNextTranscode();
    }
};

module.exports = {
    processVideo,
    enqueueTranscode
};
