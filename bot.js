const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const axios = require('axios');

const { getConfig, updateConfig } = require('./lib/config-manager');
const { 
  initializeUploader, 
  uploadVideo, 
  debugToken, 
  refreshToken 
} = require('./lib/facebook-uploader');
const { downloadTikTok } = require('./lib/tiktok-downloader');
const { downloadYouTube } = require('./lib/youtube-downloader');
const { processVideo } = require('./lib/video-processor');

const pipeline = promisify(stream.pipeline);
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Helper functions
async function downloadFile(url) {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  const tempPath = path.join(tempDir, `temp_${Date.now()}.mp4`);
  const response = await axios({ url, responseType: 'stream' });
  
  await pipeline(response.data, fs.createWriteStream(tempPath));
  return tempPath;
}

function sanitizeDescription(text) {
  return text
    .replace(/@\w+/g, '') // Hapus mention
    .replace(/\s+/g, ' ')
    .trim();
}

// Command handlers
async function handleUpload(msg, videoPath, description) {
  try {
    await msg.reply('⏳ Memulai upload ke Facebook...');
    await uploadVideo(videoPath, description);
    await msg.reply('✅ Upload berhasil!');
  } catch (e) {
    await msg.reply(`❌ Gagal upload: ${e.message}`);
    throw e;
  } finally {
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
  }
}

async function handleTikTok(msg, url) {
  try {
    const { url: videoUrl, title } = await downloadTikTok(url);
    const tempPath = await downloadFile(videoUrl);
    const processedPath = processVideo(tempPath);
    
    await handleUpload(msg, processedPath, sanitizeDescription(title));
    fs.unlinkSync(tempPath);
  } catch (e) {
    await msg.reply(`❌ Gagal proses TikTok: ${e.message}`);
  }
}

async function handleYouTube(msg, url) {
  try {
    const { url: videoUrl, title } = await downloadYouTube(url);
    const tempPath = await downloadFile(videoUrl);
    const processedPath = processVideo(tempPath);
    
    await handleUpload(msg, processedPath, sanitizeDescription(title));
    fs.unlinkSync(tempPath);
  } catch (e) {
    await msg.reply(`❌ Gagal proses YouTube: ${e.message}`);
  }
}

// Bot setup
client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('authenticated', () => console.log('✅ Authenticated!'));
client.on('ready', async () => {
  console.log('🚀 Client ready!');
  try {
    await initializeUploader();
  } catch (e) {
    console.error('❌ Gagal inisialisasi:', e.message);
    process.exit(1);
  }
});

client.on('message', async msg => {
  const text = msg.body;
  if (!text.startsWith('!')) return;

  try {
    if (text.startsWith('!t ')) {
      await handleTikTok(msg, text.split(' ')[1]);
    } else if (text.startsWith('!y ')) {
      await handleYouTube(msg, text.split(' ')[1]);
    } else if (text === '!cektoken') {
      const tokenInfo = await debugToken();
      const message = tokenInfo.valid 
        ? `✅ Token valid hingga: ${tokenInfo.expiresAt.toLocaleString()}`
        : `❌ Token invalid: ${tokenInfo.error.message}`;
      await msg.reply(message);
    } else if (text.startsWith('!updatetoken ')) {
      const newToken = text.split(' ')[1];
      updateConfig({ access_token: newToken });
      await initializeUploader();
      await msg.reply('✅ Token berhasil diperbarui!');
    }
  } catch (e) {
    await msg.reply(`❌ Error: ${e.message}`);
  }
});

client.initialize();