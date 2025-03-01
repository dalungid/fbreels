const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { processSingle, processBatch } = require('./tiktok-downloader');
const path = require('path');

const client = new Client({
    session: require(path.join(__dirname, '../sessions/session.json')),
    puppeteer: { 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', (session) => {
    require('fs').writeFileSync(
        path.join(__dirname, '../sessions/session.json'),
        JSON.stringify(session)
    );
});

client.on('ready', () => {
    console.log('WhatsApp Bot siap!');
});

client.on('message', async msg => {
    const text = msg.body;
    
    if(text.startsWith('!s')) {
        const link = text.split(' ')[1];
        try {
            await processSingle(link);
            msg.reply('✅ Video berhasil diproses dan diupload!');
        } catch (error) {
            msg.reply('❌ Gagal memproses video: ' + error.message);
        }
    }
    
    if(text.startsWith('!l')) {
        const links = text.split('\n').slice(1);
        try {
            await processBatch(links);
            msg.reply(`✅ ${links.length} video berhasil diproses!`);
        } catch (error) {
            msg.reply('❌ Gagal memproses batch: ' + error.message);
        }
    }
});

client.initialize();