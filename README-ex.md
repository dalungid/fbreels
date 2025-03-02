**Instalasi:**
1. Buat virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Download FFmpeg dan tambahkan ke PATH:
- Windows: https://ffmpeg.org/download.html#build-windows
- Linux: `sudo apt install ffmpeg`
- Mac: `brew install ffmpeg`

**Fitur Tambahan:**
1. Auto-hashtag dari sumber video + .env
2. Upload otomatis ke Facebook Reels
3. Metadata profesional dengan watermark software
4. Support bulk processing dari list.txt
5. Error handling untuk upload Facebook

**Catatan Penggunaan:**
- Untuk TikTok, pastikan URL berupa URL pendek (contoh: vm.tiktok.com/xxx)
- Token Facebook harus memiliki izin:
  - pages_manage_posts
  - pages_read_engagement
- Video hasil edit akan otomatis memiliki metadata:
  - Title sesuai deskripsi
  - Copyright owner
  - Tanggal upload
  - Watermark software