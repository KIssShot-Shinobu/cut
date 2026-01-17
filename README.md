# Video Splitter Application

Web-based video splitter yang memotong video panjang menjadi part-part 5 menit secara otomatis menggunakan FFmpeg.

## 🚀 Fitur

- ✂️ **Auto-Split Video**: Memotong video menjadi part dengan durasi yang bisa diatur
- ⚙️ **Durasi Fleksibel**: Pilih durasi 1, 3, 5, 10, 15 menit atau custom (1-60 menit)
- 🎯 **Sisa Video**: Tetap memotong video yang tersisa < durasi sebagai part terakhir
- 🌐 **Web Interface**: Interface modern dengan drag & drop
- ⚡ **Fast Processing**: Menggunakan FFmpeg dengan copy codec (tanpa re-encoding)
- 🐳 **Docker Ready**: Mudah di-deploy dengan Docker
- 📱 **Responsive**: Tampilan optimal di desktop dan mobile

## 📋 Persyaratan

- Docker & Docker Compose
- Atau: Python 3.11+ dan FFmpeg (untuk development tanpa Docker)

## 🏃 Cara Menjalankan dengan Docker

1. **Build dan jalankan container**:
```bash
docker-compose up -d
```

2. **Akses aplikasi**:
Buka browser dan kunjungi: `http://localhost:5000`

3. **Stop container**:
```bash
docker-compose down
```

## 🛠️ Cara Menjalankan Tanpa Docker (Development)

1. **Install FFmpeg**:
   - Windows: Download dari [ffmpeg.org](https://ffmpeg.org/download.html)
   - Linux: `sudo apt-get install ffmpeg`
   - Mac: `brew install ffmpeg`

2. **Install dependencies Python**:
```bash
pip install -r requirements.txt
```

3. **Jalankan aplikasi**:
```bash
python app.py
```

4. **Akses aplikasi**:
Buka browser dan kunjungi: `http://localhost:5000`

## 📁 Struktur Folder

```
cut/
├── app.py                 # Flask backend
├── requirements.txt       # Python dependencies
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose setup
├── static/
│   ├── css/
│   │   └── style.css     # Styling
│   └── js/
│       └── main.js       # Frontend logic
├── templates/
│   └── index.html        # Web interface
├── uploads/              # Temporary upload folder
└── outputs/              # Split video outputs
```

## 🎬 Cara Menggunakan

1. **Upload Video**:
   - Drag & drop video ke area upload
   - Atau klik tombol "Pilih File Video"

2. **Pilih Durasi**:
   - Pilih durasi per part dari dropdown (1, 3, 5, 10, 15 menit)
   - Atau pilih "Durasi Custom" dan masukkan durasi sendiri (1-60 menit)
   - Default: 5 menit

3. **Proses Video**:
   - Klik tombol "Proses Video"
   - Tunggu hingga proses selesai

4. **Download Hasil**:
   - Download part satu per satu
   - Atau gunakan tombol "Download Semua Part"

## 📊 Format Video yang Didukung

- MP4
- AVI
- MOV
- MKV
- FLV
- WMV
- WebM
- MPEG/MPG

**Ukuran maksimal**: 2GB per file

## 🔧 Konfigurasi

Edit `app.py` untuk mengubah konfigurasi default:

```python
SEGMENT_DURATION = 300  # Durasi default 5 menit (dalam detik)
MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
```

**Catatan**: User dapat mengatur durasi langsung dari interface web (1-60 menit).

## 🐳 Docker Commands

```bash
# Build image
docker-compose build

# Run container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop container
docker-compose down

# Remove all (termasuk volumes)
docker-compose down -v
```

## 🎨 Teknologi

- **Backend**: Python + Flask
- **Video Processing**: FFmpeg
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Container**: Docker + Docker Compose

## 📝 Catatan

- Video diproses menggunakan codec copy (`-c copy`) untuk kecepatan maksimal tanpa re-encoding
- File upload disimpan sementara dan dihapus setelah proses selesai
- Hasil split disimpan di folder `outputs/`

## 🤝 Contributing

Pull requests are welcome! Untuk perubahan besar, silakan buka issue terlebih dahulu.

## 📄 License

MIT License

---

Made with ❤️ using Flask & FFmpeg
