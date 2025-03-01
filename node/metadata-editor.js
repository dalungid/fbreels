const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

async function editMetadata(videoData) {
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${Date.now()}_${videoData.author.replace(/[^a-z0-9]/gi, '_')}.mp4`);
    
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoData.videoUrl)
            .videoCodec('copy')
            .audioCodec('copy')
            .outputOptions([
                '-metadata', `title="${videoData.description}"`,
                '-metadata', 'artist="Wondershare Filmora"',
                '-metadata', 'copyright="© User Generated Content"',
                '-metadata', 'creation_time="2023-01-01 00:00:00"',
                '-metadata', 'software="Wondershare Filmora X"'
            ])
            .on('end', () => {
                videoData.outputPath = outputPath;
                resolve(videoData);
            })
            .on('error', reject)
            .save(outputPath);
    });
}

module.exports = { editMetadata };