const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'database.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let inMemoryDB = null;

function readDB() {
  if (inMemoryDB) return inMemoryDB;
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    inMemoryDB = JSON.parse(raw);
    return inMemoryDB;
  } catch (err) {
    console.error('Error reading DB:', err);
    return inMemoryDB || null;
  }
}

function writeDB(data) {
  inMemoryDB = data;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('Filesystem read-only (e.g. Vercel serverless environment). In-memory state updated.');
    return true;
  }
}

// GET Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Santai Kawan Kopi CRM',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'production'
  });
});

// GET Ringkasan
app.get('/api/ringkasan', (req, res) => {
  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });
  res.json(db.ringkasan);
});

// GET Penjualan
app.get('/api/penjualan', (req, res) => {
  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });
  res.json(db.penjualan);
});

// GET Menu Catalog
app.get('/api/menu', (req, res) => {
  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });
  res.json(db.menu_catalog);
});

// POST Menu Baru (Katalog Hidangan & Racikan)
app.post('/api/menu', (req, res) => {
  const { name, category, sku, price, hpp, margin, status } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Nama menu dan harga jual wajib diisi.' });
  }

  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });

  const numPrice = parseInt(price.toString().replace(/[^0-9]/g, '')) || 20000;
  const numHpp = parseInt((hpp || '').toString().replace(/[^0-9]/g, '')) || Math.round(numPrice * 0.35);
  const calculatedMargin = margin || `${(((numPrice - numHpp) / numPrice) * 100).toFixed(1)}%`;

  const newSku = sku || `${(category || 'COF').substring(0, 3).toUpperCase()}-${(db.menu_catalog.items.length + 1).toString().padStart(2, '0')}`;

  const newMenuItem = {
    sku: newSku,
    name,
    category: category || 'Signature',
    hpp: `Rp${numHpp.toLocaleString('id-ID')}`,
    margin: calculatedMargin,
    sold: 0,
    price: `Rp${numPrice.toLocaleString('id-ID')}`,
    status: status || 'Aktif di Kasir',
    stock: 'Bahan aman'
  };

  if (!db.menu_catalog.items) db.menu_catalog.items = [];
  db.menu_catalog.items.unshift(newMenuItem);

  if (db.menu_catalog.kpi) {
    db.menu_catalog.kpi.total_menu = `${db.menu_catalog.items.length} Sajian`;
  }

  writeDB(db);

  res.status(201).json({
    message: 'Menu baru berhasil ditambahkan ke katalog!',
    item: newMenuItem
  });
});

// GET Inventori
app.get('/api/inventori', (req, res) => {
  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });
  res.json(db.inventori);
});

// GET Riwayat Stok (Stock Mutation History)
app.get('/api/inventori/history', (req, res) => {
  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });
  res.json(db.inventori.history || []);
});

// POST Catat Bahan Masuk / Restock
app.post('/api/inventori/restock', (req, res) => {
  const { code, name, qty, unit, supplier, pic, notes, storage_loc } = req.body;
  if (!name || !qty) {
    return res.status(400).json({ error: 'Nama bahan dan jumlah wajib diisi.' });
  }

  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });

  const mutId = `MUT-${(db.inventori.history ? db.inventori.history.length + 101 : 101)}`;
  const now = new Date();
  const dateStr = `${now.getDate()} Nov 2026 · ${now.getHours().toString().padStart(2, '0')}.${now.getMinutes().toString().padStart(2, '0')}`;

  // Find item in inventori
  let targetItem = db.inventori.items.find(i => i.code === code || i.name.toLowerCase() === name.toLowerCase());
  let newBalance = `${qty} ${unit || ''}`;

  if (targetItem) {
    const currentNum = parseFloat(targetItem.stock) || 0;
    const addNum = parseFloat(qty) || 0;
    const updatedNum = (currentNum + addNum).toFixed(1).replace('.0', '');
    targetItem.stock = `${updatedNum} ${targetItem.unit}`;
    targetItem.status = 'Aman';
    newBalance = targetItem.stock;
  } else {
    // Add new item if not exists
    const newCode = code || `BBI-${(db.inventori.items.length + 1).toString().padStart(3, '0')}`;
    targetItem = {
      code: newCode,
      name,
      supplier: supplier || 'Supplier Lokal',
      category: 'Bahan Baku',
      stock: `${qty} ${unit || 'satuan'}`,
      unit: unit || 'satuan',
      status: 'Aman'
    };
    db.inventori.items.push(targetItem);
    newBalance = targetItem.stock;
    db.inventori.kpi.total_bahan = `${db.inventori.items.length} Item`;
  }

  const newMutation = {
    id: mutId,
    date: dateStr,
    code: targetItem.code,
    name: targetItem.name,
    type: 'Masuk',
    qty: `+${qty} ${unit || targetItem.unit}`,
    balance: newBalance,
    pic: pic || 'Barista Lead',
    notes: notes || `Restock gudang (${storage_loc || 'Bar'})`
  };

  if (!db.inventori.history) db.inventori.history = [];
  db.inventori.history.unshift(newMutation);

  writeDB(db);

  res.status(201).json({
    message: 'Bahan masuk berhasil dicatat ke kartu inventori!',
    mutation: newMutation,
    item: targetItem
  });
});

// GET Laporan
app.get('/api/laporan', (req, res) => {
  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });
  res.json(db.laporan);
});

// GET Dashboard data (CRM/Member)
app.get('/api/dashboard', (req, res) => {
  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });
  res.json(db.dashboard);
});

// GET Members list with search & filter
app.get('/api/members', (req, res) => {
  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });

  let members = db.members || [];
  const { search, segment, tier, status } = req.query;

  if (search) {
    const q = search.toLowerCase();
    members = members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  }

  if (segment && segment !== 'Semua') {
    members = members.filter(m => m.segment === segment);
  }

  if (tier && tier !== 'Semua') {
    members = members.filter(m => m.tier === tier);
  }

  if (status && status !== 'Semua') {
    members = members.filter(m => m.status === status);
  }

  res.json({
    total: members.length,
    members: members
  });
});

// POST Add New Member
app.post('/api/members', (req, res) => {
  const { name, phone, email, segment, fav_menu } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Nama dan nomor HP wajib diisi.' });
  }

  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });

  const nextNum = (db.members.length + 1).toString().padStart(3, '0');
  const newMember = {
    id: `SKK-${nextNum}`,
    name,
    phone,
    email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
    segment: segment || 'Anak nugas / laptopan',
    tier: 'Kawan Baru',
    points: 25,
    visits: 1,
    last_visit: 'Hari ini',
    status: 'Aktif',
    fav_menu: fav_menu || 'Americano Dingin'
  };

  db.members.unshift(newMember);

  // Update KPI in dashboard
  db.dashboard.kpi.total_member.value += 1;
  db.dashboard.kpi.new_member.value += 1;
  db.dashboard.loyalty_target.achieved += 1;
  db.dashboard.loyalty_target.remaining = Math.max(0, db.dashboard.loyalty_target.target - db.dashboard.loyalty_target.achieved);
  db.dashboard.loyalty_target.pct = Number(((db.dashboard.loyalty_target.achieved / db.dashboard.loyalty_target.target) * 100).toFixed(1));

  writeDB(db);

  res.status(201).json({
    message: 'Member berhasil didaftarkan!',
    member: newMember,
    dashboard: db.dashboard
  });
});

// POST Re-engage (Ajak Balik)
app.post('/api/re-engage', (req, res) => {
  const { voucher } = req.body;
  res.json({
    success: true,
    message: 'Broadcast sapaan dan voucher berhasil dikirim ke 12 kawan lama via WhatsApp!',
    details: {
      recipients: 12,
      promo_code: voucher || 'KANGENKOPI20',
      status: 'Sent'
    }
  });
});

// GET Export Report CSV
app.get('/api/export', (req, res) => {
  const db = readDB();
  if (!db) return res.status(500).send('Error');

  let csv = 'ID,Nama,No. HP,Email,Segmen,Tier,Kunjungan,Poin,Status,Menu Favorit\n';
  db.members.forEach(m => {
    csv += `"${m.id}","${m.name}","${m.phone}","${m.email}","${m.segment}","${m.tier}",${m.visits},${m.points},"${m.status}","${m.fav_menu}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="Laporan_CRM_SantaiKawanKopi.csv"');
  res.send(csv);
});

// Fallback route to serve index.html for any unmatched client-side navigation
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening if run directly (local development), or export for Vercel Serverless
if (process.env.VERCEL !== '1' && require.main === module) {
  app.listen(PORT, () => {
    console.log(`Santai Kawan Kopi CRM Server is running at http://localhost:${PORT}`);
  });
}

module.exports = app;
