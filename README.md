# Santai Kawan Kopi — Dashboard CRM & Komunitas Cafe

Aplikasi web dashboard CRM & Komunitas Cafe berbasis **Node.js & Express** yang dibuat berdasarkan rancangan prototipe dari file `Santai Kawan Kopi Prototype.pdf` (Halaman 42).

## Fitur Utama

1. **Ringkasan Metrik (KPI Cards):**
   - Total Member: **482 kawan** (+14,2%)
   - Member Aktif Mingguan: **318 kawan** (+18,5%)
   - Member Baru Mingguan: **54 kawan** (+22,0%)
   - Rata-rata Kunjungan: **3,4x / minggu** (+8,2%)

2. **Grafik & Aktivitas Kawan Setia:**
   - Visualisasi bar chart kunjungan harian (Senin – Minggu) dengan highlight puncak Sabtu (**72 kawan**).
   - Distribusi frekuensi kunjungan: 1x (28%), 2–3x (48%), dan 4x+ intens (24%).

3. **Kontribusi Omzet & AOV:**
   - Total omzet 7 hari terakhir: **Rp 18.480.000**.
   - Rasio kontribusi: **Member 68%** (Rp 12.566.400) vs **Non-member 32%** (Rp 5.913.600).
   - Perbandingan belanja rata-rata (AOV): Member Rp 39.500 vs Non-member Rp 24.200 (+63% lebih royal).

4. **Segmentasi Pelanggan Cafe:**
   - Anak nugas / laptopan (34% · 164 kawan &bull; Jam 13.00–18.00 &bull; Fav: Americano Dingin).
   - Langganan harian / ngopi pagi (28% · 135 kawan &bull; Jam 08.00–11.00 &bull; Fav: Kopi Susu Kawan).
   - Pengunjung malam & nongkrong (22% · 106 kawan &bull; Jam 19.00–23.00 &bull; Fav: Manual Brew & Croissant).
   - Pembeli sesekali / take-away (16% · 77 kawan &bull; Jam acak &bull; Fav: Cold Brew Bottle).

5. **Retensi & Re-engagement ("Ajak Balik Sekarang"):**
   - Peringatan 12 kawan lama belum mampir (>14 hari absent).
   - Modal broadcast sapaan WhatsApp otomatis dan voucher diskon.

6. **Target Loyalitas November:**
   - Progres otomatis mencapai 92,4% (482/500 member, sisa 18 member).

7. **Manajemen Member & Ekspor Data:**
   - Modal tambah member baru (+ Tambah member baru) yang langsung mengupdate metrik secara real-time.
   - Tab "Daftar Member" lengkap dengan pencarian dan filter tier/segmen.
   - Fitur "Ekspor Laporan" untuk mengunduh laporan CRM dalam format CSV.

## Cara Menjalankan

1. Pastikan Node.js sudah terpasang.
2. Jalankan perintah:
   ```bash
   npm start
   ```
   *atau*
   ```bash
   node server.js
   ```
3. Buka browser pada alamat:
   ```
   http://localhost:3000
   ```
