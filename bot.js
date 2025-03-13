const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const axios = require('axios');
const { getConfig, updateConfig } = require('./lib/config-manager');
const { checkTokenValidity, uploadToFacebook } = require('./lib/facebook-uploader');
const { downloadTikTok } = require('./lib/tiktok-downloader');
const { downloadYouTube } = require('./lib/youtube-downloader');
const { processVideo } = require('./lib/video-processor');

const pipeline = promisify(stream.pipeline);
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Helper functions
function sanitizeDescription(desc) {
  return desc.replace(/@\S+/g, '').replace(/\s+/g, ' ').trim();
}

async function downloadFile(url) {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  const tempPath = path.join(tempDir, `temp_${Date.now()}.mp4`);
  const response = await axios({ url, responseType: 'stream' });
  
  await pipeline(response.data, fs.createWriteStream(tempPath));
  return tempPath;
}

async function handleUpload(msg, videoPath, description) {
  try {
    const isValid = await checkTokenValidity();
    if (!isValid) {
      await msg.reply('⚠️ Token expired! Gunakan !updatetoken [token]');
      return;
    }

    await uploadToFacebook(videoPath, description);
    await msg.reply('✅ Berhasil upload ke Facebook!');
    fs.unlinkSync(videoPath);
  } catch (e) {
    await msg.reply(`❌ Gagal upload: ${e.message}`);
    console.error('Upload Error:', e);
  }
}

// Command handlers
async function handleTikTok(msg, url) {
  try {
    await msg.reply('⏳ Memproses TikTok...');
    const { url: videoUrl, title } = await downloadTikTok(url);
    const tempPath = await downloadFile(videoUrl);
    const processedPath = processVideo(tempPath);
    await handleUpload(msg, processedPath, sanitizeDescription(title));
    fs.unlinkSync(tempPath);
  } catch (e) {
    await msg.reply(`❌ Error TikTok: ${e.message}`);
  }
}

async function handleYouTube(msg, url) {
  try {
    await msg.reply('⏳ Memproses YouTube...');
    const { url: videoUrl, title } = await downloadYouTube(url);
    const tempPath = await downloadFile(videoUrl);
    const processedPath = processVideo(tempPath);
    await handleUpload(msg, processedPath, sanitizeDescription(title));
    fs.unlinkSync(tempPath);
  } catch (e) {
    await msg.reply(`❌ Error YouTube: ${e.message}`);
  }
}

// List handlers
async function handleList(msg, type) {
  const urls = msg.body.split('\n').slice(1);
  for (const url of urls.filter(u => u.trim())) {
    try {
      if (type === 'tiktok') await handleTikTok(msg, url.trim());
      if (type === 'youtube') await handleYouTube(msg, url.trim());
    } catch (e) {
      await msg.reply(`❌ Gagal proses ${url}: ${e.message}`);
    }
  }
}

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('authenticated', () => console.log('Authenticated!'));
client.on('ready', () => console.log('Client ready!'));

client.on('message', async msg => {
  const text = msg.body;
  if (!text.startsWith('!')) return;

  try {
    if (text.startsWith('!t ')) {
      await handleTikTok(msg, text.split(' ')[1]);
    } else if (text.startsWith('!tl')) {
      await handleList(msg, 'tiktok');
    } else if (text.startsWith('!y ')) {
      await handleYouTube(msg, text.split(' ')[1]);
    } else if (text.startsWith('!yl')) {
      await handleList(msg, 'youtube');
    } else if (text.startsWith('!cektoken')) {
      const isValid = await checkTokenValidity();
      await msg.reply(isValid ? '✅ Token valid' : '⚠️ Token expired!');
    } else if (text.startsWith('!updatetoken ')) {
      updateConfig({ access_token: text.split(' ')[1] });
      await msg.reply('✅ Token berhasil diperbarui!');
    } else if (text.startsWith('!gantiwm ')) {
      updateConfig({ text: text.split(' ').slice(1).join(' ') });
      await msg.reply('✅ Watermark berhasil diubah!');
    } else if (text.startsWith('!gantifp ')) {
      updateConfig({ page_id: text.split(' ')[1] });
      await msg.reply('✅ Page ID berhasil diubah!');
    }
  } catch (e) {
    await msg.reply(`❌ Error: ${e.message}`);
  }
});

client.initialize();