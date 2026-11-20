// State
let dashboardData = null;
let membersList = [];

const PAGES = ['Ringkasan', 'Penjualan', 'Member', 'Menu', 'Inventori', 'Laporan'];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  loadMembers();

  // Handle URL hash on load (e.g. #ringkasan, #penjualan, #member)
  const hash = window.location.hash.replace('#', '').toLowerCase();
  const matched = PAGES.find(p => p.toLowerCase() === hash);
  if (matched) {
    switchMainPage(matched, false);
  } else {
    switchMainPage('Member', false);
  }

  window.addEventListener('hashchange', () => {
    const curHash = window.location.hash.replace('#', '').toLowerCase();
    const curMatched = PAGES.find(p => p.toLowerCase() === curHash);
    if (curMatched) {
      switchMainPage(curMatched, false);
    }
  });
});

// Switch Main Page / Module
function switchMainPage(pageName, updateHash = true) {
  PAGES.forEach(p => {
    const viewEl = document.getElementById(`view-page-${p.toLowerCase()}`);
    const btnEl = document.getElementById(`nav-btn-${p}`);

    if (viewEl && btnEl) {
      if (p.toLowerCase() === pageName.toLowerCase()) {
        viewEl.classList.remove('hidden');
        btnEl.className = 'nav-item-btn px-5 py-1.5 bg-[#0038d2] text-white rounded-full shadow-sm font-semibold transition-all cursor-pointer';
      } else {
        viewEl.classList.add('hidden');
        btnEl.className = 'nav-item-btn px-4 py-1.5 text-slate-600 hover:text-slate-900 rounded-full transition-all cursor-pointer';
      }
    }
  });

  if (updateHash) {
    window.location.hash = pageName.toLowerCase();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  lucide.createIcons();
}

// Load Dashboard Data (CRM / Member)
async function loadDashboardData() {
  try {
    const res = await fetch('/api/dashboard');
    if (!res.ok) throw new Error('Gagal memuat data');
    dashboardData = await res.json();
    renderDashboard(dashboardData);
  } catch (err) {
    console.error('Error fetching dashboard:', err);
  }
}

// Render Dashboard Data into DOM
function renderDashboard(data) {
  if (!data) return;

  // KPI
  if (data.kpi) {
    const totalEl = document.getElementById('kpi-total-member');
    if (totalEl) totalEl.innerText = data.kpi.total_member.value;

    const activeEl = document.getElementById('kpi-active-member');
    if (activeEl) activeEl.innerText = data.kpi.active_member.value;

    const newEl = document.getElementById('kpi-new-member');
    if (newEl) newEl.innerText = data.kpi.new_member.value;

    const avgEl = document.getElementById('kpi-avg-visits');
    if (avgEl) avgEl.innerText = data.kpi.avg_visits.value;
  }

  // Loyalty Target
  if (data.loyalty_target) {
    const lt = data.loyalty_target;
    const pctEl = document.getElementById('loyalty-pct');
    if (pctEl) pctEl.innerText = `${lt.pct.toString().replace('.', ',')}%`;

    const barEl = document.getElementById('loyalty-bar');
    if (barEl) barEl.style.width = `${Math.min(100, lt.pct)}%`;

    const achievedEl = document.getElementById('loyalty-achieved');
    if (achievedEl) achievedEl.innerText = `Tercapai: ${lt.achieved} member`;

    const targetEl = document.getElementById('loyalty-target');
    if (targetEl) targetEl.innerText = `Target: ${lt.target} member`;

    const noteEl = document.getElementById('loyalty-note');
    if (noteEl) noteEl.innerText = lt.note;
  }

  // Last Updated
  if (data.last_updated) {
    const badgeEl = document.getElementById('badge-updated');
    if (badgeEl) badgeEl.innerText = data.last_updated;
  }

  lucide.createIcons();
}

// Load Members
async function loadMembers() {
  try {
    const res = await fetch('/api/members');
    if (!res.ok) throw new Error('Gagal memuat member');
    const data = await res.json();
    membersList = data.members;
    renderMembersTable(membersList);
  } catch (err) {
    console.error('Error fetching members:', err);
  }
}

// Render Members Table
function renderMembersTable(members) {
  const tbody = document.getElementById('members-table-body');
  if (!tbody) return;

  if (members.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-8 text-center text-slate-400">
          Tidak ada data kawan/member yang cocok dengan pencarian.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = members.map(m => {
    let tierBadge = 'bg-slate-100 text-slate-700';
    if (m.tier === 'Kawan Akrab') tierBadge = 'bg-blue-100 text-blue-700 font-bold';
    else if (m.tier === 'Kawan Dekat') tierBadge = 'bg-orange-100 text-orange-800 font-bold';

    let statusBadge = m.status === 'Aktif' 
      ? '<span class="inline-flex items-center gap-1 text-emerald-700 font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Aktif</span>'
      : '<span class="inline-flex items-center gap-1 text-orange-700 font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>Perlu Disapa</span>';

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="p-3.5 pl-5 font-mono font-bold text-slate-800">${m.id}</td>
        <td class="p-3.5">
          <div class="font-bold text-slate-900">${m.name}</div>
          <div class="text-[11px] text-slate-400">${m.phone} · ${m.email}</div>
        </td>
        <td class="p-3.5">
          <span class="text-xs text-slate-700 font-medium">${m.segment}</span>
          <div class="text-[10px] text-slate-400">Fav: ${m.fav_menu}</div>
        </td>
        <td class="p-3.5">
          <span class="px-2 py-0.5 rounded-full text-[10px] ${tierBadge}">${m.tier}</span>
        </td>
        <td class="p-3.5 text-center font-bold text-slate-700">${m.visits}x</td>
        <td class="p-3.5 text-center font-bold text-[#0038d2]">${m.points} pt</td>
        <td class="p-3.5">${statusBadge}</td>
        <td class="p-3.5 pr-5 text-right">
          <a href="https://wa.me/${m.phone.replace(/[^0-9]/g, '')}" target="_blank" class="inline-flex items-center gap-1 text-xs text-[#0038d2] hover:underline font-semibold">
            Sapa WA <i data-lucide="external-link" class="w-3 h-3"></i>
          </a>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

// Search and filter members
function searchMembers() {
  filterMemberList();
}

function filterMemberList() {
  const searchInput = document.getElementById('member-search');
  const segmentSelect = document.getElementById('filter-member-segment');
  const tierSelect = document.getElementById('filter-member-tier');

  if (!searchInput || !segmentSelect || !tierSelect) return;

  const search = searchInput.value.toLowerCase();
  const segment = segmentSelect.value;
  const tier = tierSelect.value;

  const filtered = membersList.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search) ||
                        m.phone.toLowerCase().includes(search) ||
                        m.id.toLowerCase().includes(search);
    const matchSegment = segment === 'Semua' || m.segment === segment;
    const matchTier = tier === 'Semua' || m.tier === tier;
    return matchSearch && matchSegment && matchTier;
  });

  renderMembersTable(filtered);
}

// Sub-Tab Switcher (Inside Member CRM Page)
function switchSubTab(tabName) {
  const tabs = ['ikhtisar', 'members', 'segmen', 'loyalitas'];
  tabs.forEach(t => {
    const view = document.getElementById(`view-${t}`);
    const btn = document.getElementById(`tab-${t}`);
    if (view && btn) {
      if (t === tabName) {
        view.classList.remove('hidden');
        btn.className = 'px-5 py-2 rounded-full bg-[#0038d2] text-white font-semibold transition';
      } else {
        view.classList.add('hidden');
        btn.className = 'px-5 py-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition';
      }
    }
  });
  lucide.createIcons();
}

// Modal Add Member
function openAddMemberModal() {
  document.getElementById('modal-add-member').classList.remove('hidden');
}

function closeAddMemberModal() {
  document.getElementById('modal-add-member').classList.add('hidden');
  document.getElementById('form-add-member').reset();
}

// Submit New Member
async function submitNewMember(e) {
  e.preventDefault();
  const name = document.getElementById('input-name').value.trim();
  const phone = document.getElementById('input-phone').value.trim();
  const email = document.getElementById('input-email').value.trim();
  const segment = document.getElementById('input-segment').value;
  const fav_menu = document.getElementById('input-fav').value.trim();

  try {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, segment, fav_menu })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Gagal menambahkan member');
      return;
    }

    const data = await res.json();
    closeAddMemberModal();
    showToast(`✓ Member ${name} berhasil didaftarkan!`);

    loadDashboardData();
    loadMembers();

  } catch (err) {
    console.error('Error submitting member:', err);
    alert('Terjadi kesalahan koneksi ke server.');
  }
}

// Modal Re-engage
function openReengageModal() {
  document.getElementById('modal-reengage').classList.remove('hidden');
}

function closeReengageModal() {
  document.getElementById('modal-reengage').classList.add('hidden');
}

async function sendBroadcastReengage() {
  const voucher = document.getElementById('reengage-voucher').value;
  const message = document.getElementById('reengage-message').value;

  try {
    const res = await fetch('/api/re-engage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voucher, message })
    });
    const data = await res.json();
    closeReengageModal();
    showToast('🚀 Pesan WhatsApp berhasil disiarkan ke 12 kawan lama!');
  } catch (err) {
    console.error(err);
    alert('Gagal mengirim broadcast');
  }
}

// Export CSV
function exportReport() {
  window.location.href = '/api/export';
  showToast('📥 Mengunduh Laporan_CRM_SantaiKawanKopi.csv...');
}

// Notifications drawer / trigger
function toggleNotifications() {
  showToast('🔔 Notifikasi: 54 member baru terdaftar & 12 kawan butuh sapaan.');
}

// Search Modal / Input
function openSearchModal() {
  switchMainPage('Member');
  switchSubTab('members');
  const searchInput = document.getElementById('member-search');
  if (searchInput) {
    setTimeout(() => searchInput.focus(), 150);
  }
  showToast('Ketik untuk mencari di direktori kawan/member');
}

// Toast
function showToast(message) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toast-text');
  if (!toast || !text) return;
  text.innerText = message;
  toast.classList.remove('hidden');
  toast.classList.add('flex');

  setTimeout(() => {
    toast.classList.add('hidden');
    toast.classList.remove('flex');
  }, 3500);
}
