const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const axios = require('axios');
const ytdl = require('ytdl-core');
const pipeline = promisify(stream.pipeline);

const { getConfig, updateConfig } = require('./lib/config-manager');
const { checkTokenValidity, uploadToFacebook } = require('./lib/facebook-uploader');
const { downloadTikTok } = require('./lib/tiktok-downloader');
const { downloadYouTube } = require('./lib/youtube-downloader');
const { processVideo } = require('./lib/video-processor');

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
  return desc.replace(/@\S+/g, '').trim().replace(/\s+/g, ' ');
}

async function downloadFile(url) {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  
  const tempPath = path.join(tempDir, `temp_${Date.now()}.mp4`);
  const response = await axios({ url, responseType: 'stream' });
  
  await pipeline(response.data, fs.createWriteStream(tempPath));
  return tempPath;
}

function cleanup(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.error('Cleanup error:', e);
  }
}

// Command handlers
async function handleTikTok(msg, url) {
  try {
    await msg.reply('⏳ Memproses TikTok...');
    const { url: videoUrl, title } = await downloadTikTok(url);
    const cleanDesc = sanitizeDescription(title);
    
    const tempPath = await downloadFile(videoUrl);
    const processedPath = processVideo(tempPath);
    
    await handleUpload(msg, processedPath, cleanDesc);
    cleanup(tempPath);
  } catch (e) {
    await msg.reply(`❌ Gagal memproses TikTok: ${e.message}`);
  }
}

async function handleYouTube(msg, url) {
  try {
    await msg.reply('⏳ Memproses YouTube...');
    const { url: videoUrl, title } = await downloadYouTube(url);
    const cleanDesc = sanitizeDescription(title);
    
    const tempPath = await downloadFile(videoUrl);
    const processedPath = processVideo(tempPath);
    
    await handleUpload(msg, processedPath, cleanDesc);
    cleanup(tempPath);
  } catch (e) {
    await msg.reply(`❌ Gagal memproses YouTube: ${e.message}`);
  }
}

async function handleUpload(msg, videoPath, description) {
  const isValid = await checkTokenValidity();
  if (!isValid) {
    await msg.reply('⚠️ Token expired! Gunakan !updatetoken [token]');
    return;
  }

  try {
    await uploadToFacebook(videoPath, description);
    await msg.reply('✅ Berhasil upload ke Facebook!');
  } catch (e) {
    await msg.reply(`❌ Gagal upload: ${e.message}`);
  }
}

async function handleCheckToken(msg) {
  const isValid = await checkTokenValidity();
  await msg.reply(isValid ? '✅ Token valid' : '⚠️ Token expired!');
}

async function handleUpdateToken(msg) {
  const newToken = msg.body.split(' ')[1];
  updateConfig({ access_token: newToken });
  await msg.reply('✅ Token berhasil diperbarui!');
}

async function handleUpdateWatermark(msg) {
  const newText = msg.body.split(' ').slice(1).join(' ');
  updateConfig({ text: newText });
  await msg.reply(`✅ Watermark berhasil diubah ke: "${newText}"`);
}

async function handleUpdatePageId(msg) {
  const newPageId = msg.body.split(' ')[1];
  updateConfig({ page_id: newPageId });
  await msg.reply(`✅ Page ID berhasil diubah ke: "${newPageId}"`);
}

// List handlers
async function handleTikTokList(msg) {
  const urls = msg.body.split('\n').slice(1);
  for (const url of urls) {
    if (url.trim()) await handleTikTok(msg, url.trim());
  }
}

async function handleYouTubeList(msg) {
  const urls = msg.body.split('\n').slice(1);
  for (const url of urls) {
    if (url.trim()) await handleYouTube(msg, url.trim());
  }
}

// Client setup
client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('authenticated', () => console.log('Authenticated!'));
client.on('ready', () => console.log('Client is ready!'));

client.on('message', async msg => {
  const text = msg.body;
  if (!text.startsWith('!')) return;

  try {
    if (text.startsWith('!t ')) {
      await handleTikTok(msg, text.split(' ')[1]);
    } else if (text.startsWith('!tl')) {
      await handleTikTokList(msg);
    } else if (text.startsWith('!y ')) {
      await handleYouTube(msg, text.split(' ')[1]);
    } else if (text.startsWith('!yl')) {
      await handleYouTubeList(msg);
    } else if (text.startsWith('!cektoken')) {
      await handleCheckToken(msg);
    } else if (text.startsWith('!updatetoken ')) {
      await handleUpdateToken(msg);
    } else if (text.startsWith('!gantiwm ')) {
      await handleUpdateWatermark(msg);
    } else if (text.startsWith('!gantifp ')) {
      await handleUpdatePageId(msg);
    }
  } catch (e) {
    await msg.reply(`❌ Error: ${e.message}`);
  }
});

client.initialize();