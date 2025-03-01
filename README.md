**Instruksi Setup**

1. **Instalasi Dependensi**
```bash
cd node
npm install
```
```bash
cd ../python
pip install -r requirements.txt
```

2. **FFmpeg**
- Install FFmpeg di sistem
- Untuk Windows: https://ffmpeg.org/download.html
- Untuk Linux: `sudo apt install ffmpeg`

3. **Cara Menjalankan**
```bash
cd node
node whatsapp-bot.js
```

**Fitur Utama:**
1. Auto-session management untuk WhatsApp
2. Metadata editing lengkap
3. Auto-caption dengan hashtag
4. Error handling dasar
5. Support batch processing dengan delay
6. Kompatibel dengan Windows/Linux