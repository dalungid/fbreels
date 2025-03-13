const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const axios = require('axios');

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

function cleanDescription(text) {
  return text
    .replace(/@\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function handleUpload(msg, type, url) {
  let tempPath, processedPath;
  
  try {
    const config = getConfig();
    if (!config.access_token || !config.page_id) {
      throw new Error('Token atau Page ID belum diatur!');
    }

    await msg.reply('⏳ Memproses...');
    
    // Download video
    const { url: videoUrl, title } = type === 'tiktok' 
      ? await downloadTikTok(url)
      : await downloadYouTube(url);

    // Download file
    tempPath = await downloadFile(videoUrl);
    
    // Process video
    processedPath = processVideo(tempPath);
    
    // Upload
    await uploadVideo(
      processedPath,
      getConfig().text,
      cleanDescription(title)
    );
    
    await msg.reply('✅ Upload berhasil!');

  } catch (e) {
    await msg.reply(`❌ Gagal: ${e.message}`);
    console.error('Error Detail:', e.stack);
  } finally {
    // Cleanup
    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    if (processedPath && fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
  }
}

async function handleList(msg, type) {
  const urls = msg.body.split('\n').slice(1);
  for (const url of urls.filter(u => u.trim())) {
    try {
      await handleUpload(msg, type, url.trim());
    } catch (e) {
      await msg.reply(`❌ Gagal proses ${url}: ${e.message}`);
    }
  }
}

async function checkToken(msg) {
  try {
    const { access_token } = getConfig();
    const response = await axios.get(
      `https://graph.facebook.com/v22.0/debug_token?input_token=${access_token}&access_token=${access_token}`
    );
    
    const tokenData = response.data.data;
    const message = [
      `✅ Valid: ${tokenData.is_valid}`,
      `📅 Expires: ${new Date(tokenData.expires_at * 1000).toLocaleString()}`,
      `🛠 Scopes: ${tokenData.scopes.join(', ')}`
    ].join('\n');
    
    await msg.reply(message);
  } catch (e) {
    await msg.reply(`❌ Gagal cek token: ${e.response?.data?.error?.message || e.message}`);
  }
}

// Bot setup
client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('authenticated', () => console.log('✅ Autentikasi berhasil!'));
client.on('ready', () => console.log('🚀 Bot siap!'));

client.on('message', async msg => {
  const text = msg.body;
  if (!text.startsWith('!')) return;

  try {
    if (text.startsWith('!t ')) {
      await handleUpload(msg, 'tiktok', text.split(' ')[1]);
    } else if (text.startsWith('!tl')) {
      await handleList(msg, 'tiktok');
    } else if (text.startsWith('!y ')) {
      await handleUpload(msg, 'youtube', text.split(' ')[1]);
    } else if (text.startsWith('!yl')) {
      await handleList(msg, 'youtube');
    } else if (text === '!cektoken') {
      await checkToken(msg);
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