const fs = require('fs');
const path = require('path');
const XLSX = require('../public/js/vendor/xlsx.full.min.js');
const jspdfModule = require('../public/js/vendor/jspdf.umd.min.js');
const autotableModule = require('../public/js/vendor/jspdf.plugin.autotable.min.js');
autotableModule.applyPlugin(jspdfModule.jsPDF);
const db = require('../data/database.json');

const outDir = path.join(__dirname, '..', 'public', 'downloads');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// ==========================================
// 1. LAPORAN PENJUALAN LENGKAP
// ==========================================

// 1A. PDF
function buildPenjualanPDF() {
  const doc = new jspdfModule.jsPDF('p', 'mm', 'a4');
  
  // Header Banner
  doc.setFillColor(0, 56, 210);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SANTAI KAWAN KOPI', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Laporan Rekapitulasi Penjualan & Rekonsiliasi Kasir', 14, 17);
  doc.text('Cabang Kledokan (EasyEat) & Cabang Bantul (Nuta POS)', 14, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('STATUS: 100% TERVERIFIKASI', 196, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Periode: 2 - 8 November 2026', 196, 17, { align: 'right' });
  doc.text('Cetak: 8 Nov 2026 · 22:00 WIB', 196, 22, { align: 'right' });

  // KPI Cards
  const kpiData = [
    { label: 'TOTAL OMZET BERSIH', val: 'Rp18.480.000', sub: '616 Transaksi Klop' },
    { label: 'RATA-RATA BASKET', val: 'Rp30.000', sub: 'Omzet / Total Transaksi' },
    { label: 'MENU TERJUAL', val: '840 Sajian', sub: 'Top: Kopi Susu Kawan' },
    { label: 'METODE UTAMA', val: 'QRIS (68.4%)', sub: 'Rp12.640.320 Lunas' }
  ];

  let curX = 14;
  kpiData.forEach(k => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(curX, 33, 42.5, 16, 2, 2, 'FD');
    
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(k.label, curX + 3, 38);

    doc.setTextColor(0, 56, 210);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(k.val, curX + 3, 44);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(k.sub, curX + 3, 47.5);

    curX += 45;
  });

  // Table 1: Penjualan Harian
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. Rekapitulasi Penjualan Harian (Mingguan)', 14, 55);

  const dailyRows = db.ringkasan.daily_data.map(d => [
    d.full_date,
    d.trans_this_week + ' Trx',
    'Rp' + d.revenue.toLocaleString('id-ID'),
    d.avg_basket,
    d.top_menu + ' (' + d.top_menu_qty + ')',
    d.dine_in_pct + '%',
    d.takeaway_pct + '%'
  ]);
  dailyRows.push(['TOTAL MINGGUAN', '616 Trx', 'Rp18.480.000', 'Rp30.000', 'Kopi Susu Kawan (280 cup)', '65%', '35%']);

  doc.autoTable({
    startY: 58,
    head: [['Hari & Tanggal', 'Trx', 'Omzet (Rp)', 'Rerata/Trx', 'Menu Terlaris', 'Dine-In', 'Takeaway']],
    body: dailyRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 56, 210], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  let finalY1 = doc.lastAutoTable.finalY || 115;

  // Table 2: Log Audit Transaksi Kasir
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. Log Audit Transaksi Kasir (Kledokan & Bantul)', 14, finalY1 + 7);

  const trxRows = db.penjualan.transactions.slice(0, 8).map(t => [
    t.id,
    t.time,
    t.customer,
    t.type,
    t.payment,
    t.total,
    t.status,
    t.branch ? t.branch.replace('Cabang ', '') : 'Kledokan'
  ]);

  doc.autoTable({
    startY: finalY1 + 10,
    head: [['No. Struk', 'Waktu', 'Pelanggan', 'Layanan', 'Metode', 'Total (Rp)', 'Status', 'Cabang POS']],
    body: trxRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 56, 210], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  let finalY2 = doc.lastAutoTable.finalY || 185;

  // Box Konsolidasi
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, finalY2 + 5, 182, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 56, 210);
  doc.text('RINGKASAN AUDIT KONSOLIDASI:', 18, finalY2 + 10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Kledokan: 542 Trx · Rp16.240.000 (88%) | Bantul: 74 Trx · Rp2.240.000 (12%) | QRIS: 68.4% · Tunai: 21.6% · Debit: 10.0%', 18, finalY2 + 15);

  // Signatures
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Disiapkan oleh Kasir & Barista Jaga:', 14, finalY2 + 25);
  doc.text('Disetujui oleh Store Manager / Owner:', 130, finalY2 + 25);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('( Barista On-Duty )', 14, finalY2 + 37);
  doc.text('( Muh. Bagas / Store Manager )', 130, finalY2 + 37);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Santai Kawan Kopi · Dicetak otomatis melalui Sistem POS & CRM Terintegrasi', 14, 290);
  doc.text('Halaman 1 dari 1', 196, 290, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}

// 1B. XLSX
function buildPenjualanXLSX() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Rekap Harian
  const s1 = [
    ['REKAPITULASI PENJUALAN HARIAN - SANTAI KAWAN KOPI'],
    ['Periode: 2 - 8 November 2026 | Rekonsiliasi: 100% Klop EasyEat (Kledokan) & Nuta POS (Bantul)'],
    [],
    ['Hari', 'Tanggal', 'Jumlah Transaksi', 'Total Omzet (Rp)', 'Rata-rata Basket (Rp)', 'Menu Terlaris', 'Qty Menu Terlaris', 'Dine-In (%)', 'Takeaway (%)']
  ];
  db.ringkasan.daily_data.forEach(d => {
    s1.push([d.day, d.full_date, d.trans_this_week, d.revenue, d.avg_basket, d.top_menu, d.top_menu_qty, d.dine_in_pct + '%', d.takeaway_pct + '%']);
  });
  s1.push(['TOTAL', '2 - 8 Nov 2026', 616, 18480000, 'Rp30.000', 'Kopi Susu Kawan', '280 cup', '65%', '35%']);
  const ws1 = XLSX.utils.aoa_to_sheet(s1);
  ws1['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Rekap_Harian');

  // Sheet 2: Log Transaksi Kasir
  const s2 = [
    ['LOG AUDIT TRANSAKSI KASIR - MULTI CABANG (EASYEAT & NUTA POS)'],
    [],
    ['No. Struk', 'Waktu', 'Nama Pelanggan', 'Tipe Layanan', 'Metode Bayar', 'Total Belanja (Rp)', 'Status', 'Cabang POS']
  ];
  db.penjualan.transactions.forEach(t => {
    s2.push([t.id, t.time, t.customer, t.type, t.payment, t.total, t.status, t.branch || 'Cabang Kledokan (EasyEat)']);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(s2);
  ws2['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Log_Transaksi');

  // Sheet 3: Metode Bayar
  const s3 = [
    ['REKAP METODE PEMBAYARAN KASIR'],
    [],
    ['Metode Bayar', 'Persentase Volume', 'Nilai Omzet (Rp)', 'Estimasi Transaksi'],
    ['QRIS', '68.4%', 'Rp12.640.320', 421],
    ['Tunai', '21.6%', 'Rp3.991.680', 133],
    ['Kartu Debit', '10.0%', 'Rp1.848.000', 62],
    ['TOTAL', '100.0%', 'Rp18.480.000', 616]
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(s3);
  ws3['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Metode_Bayar');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// 1C. CSV
function buildPenjualanCSV() {
  let csv = '\uFEFF';
  csv += 'REKAPITULASI PENJUALAN HARIAN - SANTAI KAWAN KOPI\n';
  csv += 'Periode: 2 - 8 November 2026 | Rekonsiliasi: 100% Klop EasyEat (Kledokan) & Nuta POS (Bantul)\n\n';
  csv += 'Hari,Tanggal,Jumlah Transaksi,Total Omzet (Rp),Rata-rata Basket,Menu Terlaris,Qty Menu Terlaris,Dine-In (%),Takeaway (%)\n';
  db.ringkasan.daily_data.forEach(d => {
    csv += `"${d.day}","${d.full_date}",${d.trans_this_week},${d.revenue},"${d.avg_basket}","${d.top_menu}","${d.top_menu_qty}","${d.dine_in_pct}%","${d.takeaway_pct}%"\n`;
  });
  csv += '"TOTAL","2 - 8 Nov 2026",616,18480000,"Rp30.000","Kopi Susu Kawan","280 cup","65%","35%"\n\n';
  csv += 'LOG AUDIT TRANSAKSI KASIR\n';
  csv += 'No. Struk,Waktu,Nama Pelanggan,Tipe Layanan,Metode Bayar,Total Belanja,Status,Cabang POS\n';
  db.penjualan.transactions.forEach(t => {
    csv += `"${t.id}","${t.time}","${t.customer}","${t.type}","${t.payment}","${t.total}","${t.status}","${t.branch || 'Cabang Kledokan (EasyEat)'}"\n`;
  });
  return csv;
}

// ==========================================
// 2. LAPORAN LABA RUGI & HPP
// ==========================================

// 2A. PDF
function buildLabaRugiPDF() {
  const doc = new jspdfModule.jsPDF('p', 'mm', 'a4');

  // Header Banner
  doc.setFillColor(0, 56, 210);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SANTAI KAWAN KOPI', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Laporan Laba Rugi Operasional & Analisis Beban HPP (P&L Analysis)', 14, 17);
  doc.text('Katalog Sajian, Struktur Resep, & Efisiensi Bahan Baku Bar', 14, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('STATUS: SANGAT SEHAT (67.0%)', 196, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Periode: 2 - 8 November 2026', 196, 17, { align: 'right' });
  doc.text('Cetak: 8 Nov 2026 · 22:00 WIB', 196, 22, { align: 'right' });

  // KPI Cards
  const kpiData = [
    { label: 'OMZET KOTOR (GROSS)', val: 'Rp18.480.000', sub: '100.0% Pendapatan' },
    { label: 'TOTAL BEBAN HPP', val: 'Rp6.098.400', sub: '33.0% thd Omzet' },
    { label: 'LABA KOTOR (GROSS)', val: 'Rp12.381.600', sub: 'Margin 67.0% Sehat' },
    { label: 'EST. LABA BAR', val: 'Rp11.861.600', sub: 'Setelah Waste & Cup' }
  ];

  let curX = 14;
  kpiData.forEach(k => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(curX, 33, 42.5, 16, 2, 2, 'FD');
    
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(k.label, curX + 3, 38);

    doc.setTextColor(0, 56, 210);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(k.val, curX + 3, 44);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(k.sub, curX + 3, 47.5);

    curX += 45;
  });

  // Table 1: Ringkasan P&L
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. Ringkasan Laporan Laba Rugi Operasional Bar', 14, 55);

  const plRows = [
    ['Pendapatan Penjualan Kotor (Gross Revenue)', 'Rp18.480.000', '100.0%', 'Terverifikasi 616 transaksi (Kledokan + Bantul)'],
    ['Beban Pokok Penjualan / HPP Bahan Baku', '(Rp6.098.400)', '33.0%', 'Biji kopi blend, fresh milk, sirup aren, cup'],
    ['LABA KOTOR OPERASIONAL (GROSS PROFIT)', 'Rp12.381.600', '67.0%', 'Sangat Sehat (Target industri cafe minimal 60%)'],
    ['Beban Kemasan & Operasional Bar (Waste/Loss)', '(Rp520.000)', '2.8%', 'Cup lid, paper straw, napkin, kalibrasi bar'],
    ['ESTIMASI LABA OPERASIONAL BAR', 'Rp11.861.600', '64.2%', 'Sebelum beban sewa tempat & utilitas bulanan']
  ];

  doc.autoTable({
    startY: 58,
    head: [['Komponen Finansial', 'Nilai Nominal (Rp)', 'Rasio Omzet', 'Catatan Evaluasi Operasional']],
    body: plRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 56, 210], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  let finalY1 = doc.lastAutoTable.finalY || 105;

  // Table 2: Analisis HPP Menu
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. Matriks Menu Engineering & Analisis HPP Per Porsi', 14, finalY1 + 7);

  const menuRows = db.menu_catalog.items.map(m => {
    const priceNum = parseInt(m.price.replace(/[^0-9]/g, '')) || 0;
    const hppNum = parseInt(m.hpp.replace(/[^0-9]/g, '')) || 0;
    const marginRp = priceNum - hppNum;
    return [
      m.sku,
      m.name,
      m.category,
      m.price,
      m.hpp,
      'Rp' + marginRp.toLocaleString('id-ID'),
      m.margin,
      m.sold + ' cup',
      'Rp' + (priceNum * m.sold).toLocaleString('id-ID')
    ];
  });

  doc.autoTable({
    startY: finalY1 + 10,
    head: [['SKU', 'Nama Menu', 'Kategori', 'Harga', 'HPP', 'Margin Rp', 'Margin %', 'Terjual', 'Omzet']],
    body: menuRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 56, 210], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 6.8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  let finalY2 = doc.lastAutoTable.finalY || 175;

  // Box Catatan Bahan Baku
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, finalY2 + 5, 182, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 56, 210);
  doc.text('CATATAN AUDIT BAHAN BAKU:', 18, finalY2 + 10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('House Blend: 8.2 kg (Aman) | Fresh Milk: 18.0 L (Aman) | Sirup Aren: 2.5 L (Kritis <2 hari) | Matcha: 1.1 kg (Menipis) | Cup 16oz: 420 pcs', 18, finalY2 + 15);

  // Signatures
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Disiapkan oleh Finance & Bar Lead:', 14, finalY2 + 25);
  doc.text('Disetujui oleh Store Manager / Owner:', 130, finalY2 + 25);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('( Head Bar & Finance )', 14, finalY2 + 37);
  doc.text('( Muh. Bagas / Store Manager )', 130, finalY2 + 37);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Santai Kawan Kopi · Dicetak otomatis melalui Sistem Laporan & CRM POS Terintegrasi', 14, 290);
  doc.text('Halaman 1 dari 1', 196, 290, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}

// 2B. XLSX
function buildLabaRugiXLSX() {
  const wb = XLSX.utils.book_new();

  const s1 = [
    ['LAPORAN LABA RUGI OPERASIONAL & HPP - SANTAI KAWAN KOPI'],
    ['Periode: 2 - 8 November 2026 | Status Margin: Sangat Sehat (67.0%)'],
    [],
    ['Komponen Finansial', 'Nilai Nominal (Rp)', 'Rasio terhadap Omzet (%)', 'Catatan Evaluasi'],
    ['Total Pendapatan Kotor (Gross Sales)', 18480000, '100.0%', 'Terverifikasi 616 transaksi'],
    ['Beban Pokok Penjualan (HPP Bahan Baku)', 6098400, '33.0%', 'Rasio HPP target < 35% tercapai'],
    ['LABA KOTOR (GROSS PROFIT)', 12381600, '67.0%', 'Margin kotor sangat sehat'],
    ['Beban Bahan Kemasan & Operasional Bar', 520000, '2.8%', 'Cup 16oz, sedotan ramah lingkungan, lid'],
    ['ESTIMASI LABA OPERASIONAL BAR', 11861600, '64.2%', 'Sebelum beban sewa & utilitas bulanan']
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(s1);
  ws1['!cols'] = [{ wch: 42 }, { wch: 22 }, { wch: 26 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan_PL');

  const s2 = [
    ['ANALISIS HPP DAN MARGIN PER PORSI MENU (MENU ENGINEERING)'],
    [],
    ['SKU', 'Nama Menu', 'Kategori', 'Harga Jual (Rp)', 'HPP Porsi (Rp)', 'Laba Kotor (Rp)', 'Margin (%)', 'Terjual (Porsi)', 'Total Omzet (Rp)', 'Total HPP (Rp)']
  ];
  db.menu_catalog.items.forEach(m => {
    const priceNum = parseInt(m.price.replace(/[^0-9]/g, '')) || 0;
    const hppNum = parseInt(m.hpp.replace(/[^0-9]/g, '')) || 0;
    s2.push([m.sku, m.name, m.category, priceNum, hppNum, priceNum - hppNum, m.margin, m.sold, priceNum * m.sold, hppNum * m.sold]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(s2);
  ws2['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Analisis_HPP_Menu');

  const s3 = [
    ['STATUS INVENTORI BAHAN BAKU & SUPPLIER'],
    [],
    ['Kode Bahan', 'Nama Bahan Baku', 'Kategori', 'Stok Tersedia', 'Satuan', 'Status Stok', 'Supplier Rekanan']
  ];
  db.inventori.items.forEach(i => {
    s3.push([i.code, i.name, i.category, i.stock, i.unit, i.status, i.supplier]);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(s3);
  ws3['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Inventori_Bahan');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// 2C. CSV
function buildLabaRugiCSV() {
  let csv = '\uFEFF';
  csv += 'LAPORAN LABA RUGI OPERASIONAL & HPP - SANTAI KAWAN KOPI\n';
  csv += 'Periode: 2 - 8 November 2026 | Status Margin: Sangat Sehat (67.0%)\n\n';
  csv += 'Komponen Finansial,Nilai Nominal (Rp),Rasio terhadap Omzet,Catatan Evaluasi\n';
  csv += '"Total Pendapatan Kotor",18480000,"100.0%","Terverifikasi 616 transaksi"\n';
  csv += '"Beban Pokok Penjualan (HPP Bahan)",6098400,"33.0%","Rasio HPP target < 35% tercapai"\n';
  csv += '"LABA KOTOR (GROSS PROFIT)",12381600,"67.0%","Margin kotor sangat sehat"\n';
  csv += '"Beban Kemasan & Operasional Bar",520000,"2.8%","Cup 16oz, sedotan ramah lingkungan, lid"\n';
  csv += '"ESTIMASI LABA OPERASIONAL BAR",11861600,"64.2%","Sebelum sewa & utilitas bulanan"\n\n';
  csv += 'ANALISIS HPP DAN MARGIN PER PORSI MENU\n';
  csv += 'SKU,Nama Menu,Kategori,Harga Jual,HPP Porsi,Laba Kotor,Margin,Terjual,Total Omzet,Total HPP\n';
  db.menu_catalog.items.forEach(m => {
    const priceNum = parseInt(m.price.replace(/[^0-9]/g, '')) || 0;
    const hppNum = parseInt(m.hpp.replace(/[^0-9]/g, '')) || 0;
    csv += `"${m.sku}","${m.name}","${m.category}",${priceNum},${hppNum},${priceNum - hppNum},"${m.margin}",${m.sold},${priceNum * m.sold},${hppNum * m.sold}\n`;
  });
  return csv;
}

// ==========================================
// 3. LAPORAN PERFORMA MENU & KATALOG
// ==========================================

function buildMenuPDF() {
  const doc = new jspdfModule.jsPDF('p', 'mm', 'a4');
  doc.setFillColor(0, 56, 210);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SANTAI KAWAN KOPI', 14, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Laporan Evaluasi Performa Menu & Menu Engineering Mix', 14, 17);
  doc.text('Peringkat Penjualan, Kontribusi Omzet, & Margin Sajian', 14, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOP SAJIAN: SAWAN (280 CUP)', 196, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Periode: 2 - 8 Nov 2026', 196, 17, { align: 'right' });

  const rows = db.menu_catalog.items.map(m => {
    const p = parseInt(m.price.replace(/[^0-9]/g, '')) || 0;
    const h = parseInt(m.hpp.replace(/[^0-9]/g, '')) || 0;
    return [m.sku, m.name, m.category, m.price, m.hpp, m.margin, m.sold + ' cup', 'Rp' + (p * m.sold).toLocaleString('id-ID'), m.status];
  });

  doc.autoTable({
    startY: 34,
    head: [['SKU', 'Nama Sajian', 'Kategori', 'Harga Jual', 'Biaya HPP', 'Margin %', 'Terjual', 'Total Omzet', 'Status Kasir']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [0, 56, 210], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  const finalY = doc.lastAutoTable.finalY || 160;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Santai Kawan Kopi · Dicetak dari Sistem POS & CRM Terintegrasi', 14, 290);

  return Buffer.from(doc.output('arraybuffer'));
}

function buildMenuXLSX() {
  const wb = XLSX.utils.book_new();
  const s = [
    ['LAPORAN PERFORMA MENU & KATALOG SAJIAN - SANTAI KAWAN KOPI'],
    [],
    ['SKU', 'Nama Menu', 'Kategori', 'Harga Jual (Rp)', 'HPP Porsi (Rp)', 'Laba Kotor (Rp)', 'Margin (%)', 'Terjual (Porsi)', 'Total Omzet (Rp)', 'Total HPP (Rp)', 'Status Kasir']
  ];
  db.menu_catalog.items.forEach(m => {
    const priceNum = parseInt(m.price.replace(/[^0-9]/g, '')) || 0;
    const hppNum = parseInt(m.hpp.replace(/[^0-9]/g, '')) || 0;
    s.push([m.sku, m.name, m.category, priceNum, hppNum, priceNum - hppNum, m.margin, m.sold, priceNum * m.sold, hppNum * m.sold, m.status]);
  });
  const ws = XLSX.utils.aoa_to_sheet(s);
  ws['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Performa_Menu');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function buildMenuCSV() {
  let csv = '\uFEFF';
  csv += 'LAPORAN PERFORMA MENU & KATALOG SAJIAN - SANTAI KAWAN KOPI\n\n';
  csv += 'SKU,Nama Menu,Kategori,Harga Jual,HPP Porsi,Laba Kotor,Margin,Terjual,Total Omzet,Total HPP,Status Kasir\n';
  db.menu_catalog.items.forEach(m => {
    const priceNum = parseInt(m.price.replace(/[^0-9]/g, '')) || 0;
    const hppNum = parseInt(m.hpp.replace(/[^0-9]/g, '')) || 0;
    csv += `"${m.sku}","${m.name}","${m.category}",${priceNum},${hppNum},${priceNum - hppNum},"${m.margin}",${m.sold},${priceNum * m.sold},${hppNum * m.sold},"${m.status}"\n`;
  });
  return csv;
}

// ==========================================
// 4. LAPORAN CRM & 4 SEGMEN MEMBER
// ==========================================

function buildMemberPDF() {
  const doc = new jspdfModule.jsPDF('p', 'mm', 'a4');
  doc.setFillColor(0, 56, 210);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SANTAI KAWAN KOPI', 14, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Laporan Database Loyalty Member & Analisis 4 Segmen CRM', 14, 17);
  doc.text('Kawan Circle, Profil Rasa, Kotak Suara Kawan, & Sunset Slot', 14, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL: 482 MEMBER (100%)', 196, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('Periode: Nov 2026', 196, 17, { align: 'right' });

  // Tabel 4 Segmen
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. Distribusi 4 Segmen Pelanggan', 14, 34);

  const segmenRows = [
    ['Anak Nugas & WFC', '34%', '164 Member', 'Americano & French Fries', '13.00 - 18.00', 'Refill Americano Hemat & Wi-Fi stabil'],
    ['Langganan Harian / Ngopi Pagi', '28%', '135 Member', 'Kopi Susu Kawan & Croissant', '08.00 - 11.00', 'Sapaan Profil Rasa (<30s) & Bundling Sarapan'],
    ['Pengunjung Malam & Komunitas', '22%', '106 Member', 'Signature Sawan & Tahu Cabai Garam', '19.00 - 23.30', 'Kawan Circle Meja (8 stamp) & Sunset Slot'],
    ['Pembeli Sesekali / Take-away', '16%', '77 Member', 'Cold Brew Bottle & Kopsu 1L', 'Fleksibel', 'Stiker QR Code Loyalty di Cup & WA Broadcast']
  ];

  doc.autoTable({
    startY: 37,
    head: [['Segmen Pelanggan', 'Porsi %', 'Jumlah', 'Menu Favorit', 'Jam Prime', 'Inisiatif Program CRM']],
    body: segmenRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 56, 210], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  const finalY1 = doc.lastAutoTable.finalY || 80;

  // Tabel Sample Member
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. Direktori Member Terdaftar (Sampel Rekap)', 14, finalY1 + 7);

  const memberRows = db.members.map(m => [
    m.id,
    m.name,
    m.phone,
    m.segment,
    m.tier,
    m.visits + 'x',
    m.points + ' pts',
    m.status,
    m.fav_menu
  ]);

  doc.autoTable({
    startY: finalY1 + 10,
    head: [['ID', 'Nama Member', 'No. HP', 'Segmen', 'Tier', 'Kunjungan', 'Poin', 'Status', 'Menu Favorit']],
    body: memberRows,
    theme: 'grid',
    headStyles: { fillColor: [0, 56, 210], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Santai Kawan Kopi · Database CRM Loyalty Program', 14, 290);

  return Buffer.from(doc.output('arraybuffer'));
}

function buildMemberXLSX() {
  const wb = XLSX.utils.book_new();
  const s1 = [
    ['RINGKASAN 4 SEGMEN PELANGGAN SANTAI KAWAN KOPI'],
    [],
    ['Segmen', 'Persentase', 'Jumlah Member', 'Menu Favorit', 'Jam Prime', 'Inisiatif CRM'],
    ['Anak Nugas & WFC', '34%', '164 Member', 'Americano & French Fries', '13.00 - 18.00', 'Refill Americano Hemat & Wi-Fi stabil'],
    ['Langganan Harian / Ngopi Pagi', '28%', '135 Member', 'Kopi Susu Kawan & Croissant', '08.00 - 11.00', 'Sapaan Profil Rasa (<30s) & Sarapan Pagi'],
    ['Pengunjung Malam & Komunitas', '22%', '106 Member', 'Signature Sawan & Tahu Cabai Garam', '19.00 - 23.30', 'Kawan Circle Meja (8 stamp) & Santai Slot Sunset'],
    ['Pembeli Sesekali / Take-away & Delivery', '16%', '77 Member', 'Cold Brew Bottle & Kopsu 1L', 'Fleksibel', 'Stiker QR Code Loyalty di Cup & WA']
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(s1);
  ws1['!cols'] = [{ wch: 36 }, { wch: 14 }, { wch: 16 }, { wch: 32 }, { wch: 16 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan_4_Segmen');

  const s2 = [
    ['DATABASE MEMBER LOYALTY - SANTAI KAWAN KOPI'],
    [],
    ['ID Member', 'Nama Lengkap', 'Nomor HP', 'Email', 'Segmen Pelanggan', 'Tier Loyalty', 'Kunjungan', 'Poin', 'Status', 'Menu Favorit']
  ];
  db.members.forEach(m => {
    s2.push([m.id, m.name, m.phone, m.email, m.segment, m.tier, m.visits, m.points, m.status, m.fav_menu]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(s2);
  ws2['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 26 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Member_CRM');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function buildMemberCSV() {
  let csv = '\uFEFF';
  csv += 'DATABASE LOYALTY MEMBER & 4 SEGMEN CRM - SANTAI KAWAN KOPI\n';
  csv += 'Total: 482 Member (Anak Nugas 34%, Ngopi Pagi 28%, Komunitas Malam 22%, Take-away 16%)\n\n';
  csv += 'ID,Nama,No. HP,Email,Segmen,Tier,Kunjungan,Poin,Status,Menu Favorit\n';
  db.members.forEach(m => {
    csv += `"${m.id}","${m.name}","${m.phone}","${m.email}","${m.segment}","${m.tier}",${m.visits},${m.points},"${m.status}","${m.fav_menu}"\n`;
  });
  return csv;
}

// ==========================================
// BUILD ALL ARTIFACTS
// ==========================================
console.log('Building all static report downloads...');

fs.writeFileSync(path.join(outDir, 'Laporan_Penjualan_SantaiKawan_Nov2026.pdf'), buildPenjualanPDF());
fs.writeFileSync(path.join(outDir, 'Laporan_Penjualan_SantaiKawan_Nov2026.xlsx'), buildPenjualanXLSX());
fs.writeFileSync(path.join(outDir, 'Laporan_Penjualan_SantaiKawan_Nov2026.csv'), buildPenjualanCSV(), 'utf8');

fs.writeFileSync(path.join(outDir, 'Laporan_Laba_Rugi_HPP_SantaiKawan_Nov2026.pdf'), buildLabaRugiPDF());
fs.writeFileSync(path.join(outDir, 'Laporan_Laba_Rugi_HPP_SantaiKawan_Nov2026.xlsx'), buildLabaRugiXLSX());
fs.writeFileSync(path.join(outDir, 'Laporan_Laba_Rugi_HPP_SantaiKawan_Nov2026.csv'), buildLabaRugiCSV(), 'utf8');

fs.writeFileSync(path.join(outDir, 'Laporan_Performa_Menu_SantaiKawan_Nov2026.pdf'), buildMenuPDF());
fs.writeFileSync(path.join(outDir, 'Laporan_Performa_Menu_SantaiKawan_Nov2026.xlsx'), buildMenuXLSX());
fs.writeFileSync(path.join(outDir, 'Laporan_Performa_Menu_SantaiKawan_Nov2026.csv'), buildMenuCSV(), 'utf8');

fs.writeFileSync(path.join(outDir, 'Laporan_CRM_Member_SantaiKawan_Nov2026.pdf'), buildMemberPDF());
fs.writeFileSync(path.join(outDir, 'Laporan_CRM_Member_SantaiKawan_Nov2026.xlsx'), buildMemberXLSX());
fs.writeFileSync(path.join(outDir, 'Laporan_CRM_Member_SantaiKawan_Nov2026.csv'), buildMemberCSV(), 'utf8');

console.log('All 12 report files successfully generated in public/downloads!');

module.exports = {
  buildPenjualanPDF,
  buildPenjualanXLSX,
  buildPenjualanCSV,
  buildLabaRugiPDF,
  buildLabaRugiXLSX,
  buildLabaRugiCSV,
  buildMenuPDF,
  buildMenuXLSX,
  buildMenuCSV,
  buildMemberPDF,
  buildMemberXLSX,
  buildMemberCSV
};
