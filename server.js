const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'database.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB:', err);
    return null;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

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

// GET Inventori
app.get('/api/inventori', (req, res) => {
  const db = readDB();
  if (!db) return res.status(500).json({ error: 'Database error' });
  res.json(db.inventori);
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

app.listen(PORT, () => {
  console.log(`Santai Kawan Kopi CRM Server is running at http://localhost:${PORT}`);
});
