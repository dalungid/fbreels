const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const axios = require('axios');

const { getConfig } = require('./lib/config');
const { uploadReels } = require('./lib/facebook-uploader');
const { downloadTikTok } = require('./lib/tiktok-downloader');
const { downloadYouTube } = require('./lib/youtube-downloader');
const { processVideo } = require('./lib/video-processor');

const pipeline = promisify(stream.pipeline);
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox']
  }
});

async function downloadFile(url) {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  const tempPath = path.join(tempDir, `temp_${Date.now()}.mp4`);
  const response = await axios({ url, responseType: 'stream' });
  
  await pipeline(response.data, fs.createWriteStream(tempPath));
  return tempPath;
}

async function handleUpload(msg, type, url) {
  let tempPath, processedPath;
  
  try {
    // Download video
    const { url: videoUrl, title } = type === 'tiktok' 
      ? await downloadTikTok(url)
      : await downloadYouTube(url);

    // Download file
    tempPath = await downloadFile(videoUrl);
    
    // Process video
    processedPath = processVideo(tempPath);
    
    // Upload ke Facebook
    const { success, error, screenshot } = await uploadReels(
      processedPath,
      `${title} ${getConfig().watermark.text}`
    );

    if (success) {
      await msg.reply('✅ Reels berhasil diupload!');
    } else {
      await msg.reply(`❌ Gagal upload: ${error}\n📸 Screenshot: ${screenshot}`);
    }

  } catch (e) {
    await msg.reply(`❌ Error: ${e.message}`);
    console.error(e.stack);
  } finally {
    [tempPath, processedPath].forEach(p => {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    });
  }
}

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('authenticated', () => console.log('✅ Autentikasi WhatsApp berhasil!'));
client.on('ready', () => console.log('🤖 Bot siap menerima command!'));

client.on('message', async msg => {
  const text = msg.body;
  if (!text.startsWith('!')) return;

  try {
    if (text.startsWith('!t ')) {
      await handleUpload(msg, 'tiktok', text.split(' ')[1]);
    } else if (text.startsWith('!y ')) {
      await handleUpload(msg, 'youtube', text.split(' ')[1]);
    } else if (text.startsWith('!login')) {
      await msg.reply('🔑 Jalankan perintah berikut di server:\nnpm run login');
    } else if (text.startsWith('!wm ')) {
      const newText = text.split(' ').slice(1).join(' ');
      // Implement update watermark
      await msg.reply(`🖼️ Watermark diubah ke: ${newText}`);
    }
  } catch (e) {
    await msg.reply(`❌ Error: ${e.message}`);
  }
});

client.initialize();