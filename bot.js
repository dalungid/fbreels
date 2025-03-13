const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');

const { getConfig, updateConfig } = require('./lib/config');
const { uploadVideo } = require('./lib/facebook');
const { downloadTikTok } = require('./lib/tiktok');
const { downloadYouTube } = require('./lib/youtube');
const { processVideo } = require('./lib/video');

const pipeline = promisify(stream.pipeline);
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote'
      ],
      executablePath: '/usr/bin/chromium-browser'
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

function cleanDescription(text) {
  return text
    .replace(/@\S+/g, '') // Remove mentions
    .replace(/\s+/g, ' ')
    .trim();
}

async function handleUpload(msg, type, url) {
  try {
    await msg.reply('⏳ Memproses...');
    
    // Download video
    const { url: videoUrl, title } = type === 'tiktok' 
      ? await downloadTikTok(url)
      : await downloadYouTube(url);

    // Download file
    const tempPath = await downloadFile(videoUrl);
    
    // Process video
    const processedPath = processVideo(tempPath);
    
    // Upload
    await uploadVideo(
      processedPath,
      getConfig().text,
      cleanDescription(title)
    );
    
    // Cleanup
    [tempPath, processedPath].forEach(p => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    await msg.reply('✅ Upload berhasil!');

  } catch (e) {
    await msg.reply(`❌ Gagal: ${e.message}`);
    console.error(e);
  }
}

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('authenticated', () => console.log('✅ Autentikasi berhasil!'));
client.on('ready', () => console.log('🚀 Bot siap!'));

client.on('message', async msg => {
  const text = msg.body;
  if (!text.startsWith('!')) return;

  try {
    if (text.startsWith('!t ')) {
      await handleUpload(msg, 'tiktok', text.split(' ')[1]);
    } else if (text.startsWith('!y ')) {
      await handleUpload(msg, 'youtube', text.split(' ')[1]);
    } else if (text.startsWith('!updatetoken ')) {
      updateConfig({ access_token: text.split(' ')[1] });
      await msg.reply('✅ Token diperbarui!');
    } else if (text.startsWith('!gantiwm ')) {
      updateConfig({ text: text.split(' ').slice(1).join(' ') });
      await msg.reply('✅ Watermark diperbarui!');
    }
  } catch (e) {
    await msg.reply(`❌ Error: ${e.message}`);
  }
});

client.initialize();