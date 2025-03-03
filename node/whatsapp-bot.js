const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const qrcode = require('qrcode-terminal');
const { processSingle, processBatch } = require('./tiktok-downloader');
const path = require('path');
const fs = require('fs');

// Menentukan lokasi untuk menyimpan sesi
const authPath = path.join(__dirname, 'sessions');

// Menggunakan sesi yang sudah ada atau membuat sesi baru
const { state, saveCreds } = useMultiFileAuthState(authPath);

async function startBot() {
    // Check if credentials are available
    if (!state || !state.creds) {
        console.error('No credentials found, please authenticate the bot first.');
        return;
    }

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true // This will print the QR code in the terminal
    });

    // Handle QR code for authentication
    sock.ev.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
    });

    // Handle connection updates (opening, closing, etc.)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                startBot();  // reconnect if disconnected
            }
        }
        if (connection === 'open') {
            console.log('Bot siap!');
        }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        const text = msg?.message?.conversation;

        if (text) {
            if (text.startsWith('!s')) {
                // Process single video
                const link = text.split(' ')[1];
                try {
                    await processSingle(link);
                    await sock.sendMessage(msg.key.remoteJid, { text: '✅ Video berhasil diproses dan diupload!' });
                } catch (error) {
                    await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal memproses video: ' + error.message });
                }
            }

            if (text.startsWith('!l')) {
                // Process batch of links
                const links = text.split('\n').slice(1);
                try {
                    await processBatch(links);
                    await sock.sendMessage(msg.key.remoteJid, { text: `✅ ${links.length} video berhasil diproses!` });
                } catch (error) {
                    await sock.sendMessage(msg.key.remoteJid, { text: '❌ Gagal memproses batch: ' + error.message });
                }
            }
        }
    });
}

startBot();
