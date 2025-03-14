const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('./config');
const ffmpeg = require('ffmpeg-static');

function processVideo(inputPath) {
  const config = getConfig().watermark;
  const outputDir = path.join(__dirname, '../result');
  const outputName = `processed_${Date.now()}.mp4`;
  const outputPath = path.join(outputDir, outputName);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filter = [
    `drawtext=text='${config.text}'`,
    `fontcolor=${config.color}@${config.opacity}`,
    `fontsize=${config.font_size}`,
    `x=10:y=(h-text_h)/2`,
    `shadowx=${config.shadow_offset}`,
    `shadowy=${config.shadow_offset}`,
    `shadowcolor=${config.color}@${config.opacity}`
  ].join(':');

  try {
    execSync(
      `${ffmpeg} -y -i "${inputPath}" ` +
      `-vf "${filter}" ` +
      `-c:v libx264 -b:v 8M ` +
      `-c:a aac -b:a 192k "${outputPath}"`,
      { stdio: 'inherit' }
    );
    return outputPath;
  } catch (e) {
    throw new Error(`Gagal memproses video: ${e.message}`);
  }
}

module.exports = { processVideo };