// State
let dashboardData = null;
let ringkasanData = null;
let membersList = [];
let inventoriList = [];
let stockHistoryList = [];
let menuList = [];
let selectedMenuCategory = 'Semua';
let activeHistTab = 'all';
let selectedInvCategory = 'Semua';
let selectedDay = null;

const PAGES = ['Ringkasan', 'Penjualan', 'Member', 'Menu', 'Inventori', 'Laporan'];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  loadRingkasanData();
  loadMembers();
  loadInventori();
  loadMenu();

  // Handle URL hash on load (e.g. #ringkasan, #penjualan, #member)
  const hash = window.location.hash.replace('#', '').toLowerCase();
  const matched = PAGES.find(p => p.toLowerCase() === hash);
  if (matched) {
    switchMainPage(matched, false);
  } else {
    switchMainPage('Ringkasan', false);
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

// =============================================================================
// RINGKASAN REACTIVE ANALYTICS & CLUSTERED BARS
// =============================================================================

async function loadRingkasanData() {
  try {
    const res = await fetch('/api/ringkasan');
    if (!res.ok) throw new Error('Gagal memuat data ringkasan');
    ringkasanData = await res.json();
    renderRingkasan(ringkasanData);
  } catch (err) {
    console.error('Error fetching ringkasan:', err);
  }
}

function renderRingkasan(data) {
  if (!data) return;

  // Render KPIs
  if (data.kpi) {
    const pEl = document.getElementById('rkpi-pendapatan');
    if (pEl) pEl.innerText = data.kpi.pendapatan;
    const lEl = document.getElementById('rkpi-laba');
    if (lEl) lEl.innerText = data.kpi.laba_kotor;
    const tEl = document.getElementById('rkpi-transaksi');
    if (tEl) tEl.innerText = data.kpi.total_transaksi;
    const mEl = document.getElementById('rkpi-menu');
    if (mEl) mEl.innerText = data.kpi.menu_terjual;
  }

  // Render Daily Revenue Bars
  renderDailyRevBars(data.daily_data);

  // Render Clustered Bars
  renderClusteredBars(data.daily_data);

  lucide.createIcons();
}

// 1. Render Pendapatan Harian (Clickable single bars)
function renderDailyRevBars(dailyData) {
  const container = document.getElementById('container-daily-rev');
  if (!container || !dailyData) return;

  container.innerHTML = dailyData.map(item => {
    const isPeak = !!item.peak;
    const isSelected = selectedDay === item.day;
    const barColor = isSelected ? 'bg-[#ff8030]' : (isPeak ? 'bg-[#ff8030]' : 'bg-[#fed7aa]');
    const heightPx = Math.round((item.revenue / 3600000) * 115) + 20;

    return `
      <div onclick="selectDay('${item.day}')" 
           class="daily-rev-bar-group flex-1 flex flex-col items-center gap-1.5 cursor-pointer group" 
           title="${item.full_date}: ${item.revenue_label} (${item.trans_this_week} trx)">
        <span class="text-[10px] font-bold ${isPeak ? 'text-[#ff8030]' : 'text-slate-500'} group-hover:text-[#ff8030] transition">
          ${item.revenue_label.replace(' jt', '')}
        </span>
        <div class="daily-rev-bar w-full ${barColor} rounded-t-xl transition-all ${isSelected ? 'is-selected ring-2 ring-orange-500' : ''}" 
             style="height: ${heightPx}px;"></div>
        <span class="text-[11px] font-bold ${isPeak ? 'text-[#ff8030] font-black' : 'text-slate-600'}">
          ${item.day}
        </span>
      </div>
    `;
  }).join('');
}

// 2. Render Clustered Bars (Minggu Ini vs Minggu Lalu)
function renderClusteredBars(dailyData) {
  const container = document.getElementById('container-clustered-bars');
  if (!container || !dailyData) return;

  const maxVal = 130; // max scale for transactions

  container.innerHTML = dailyData.map(item => {
    const isPeak = !!item.peak;
    const isSelected = selectedDay === item.day;
    const hThisWeek = Math.round((item.trans_this_week / maxVal) * 115) + 15;
    const hLastWeek = Math.round((item.trans_last_week / maxVal) * 115) + 15;

    return `
      <div onclick="selectDay('${item.day}')" 
           class="clustered-bar-group flex-1 flex flex-col items-center gap-1 cursor-pointer group ${isSelected ? 'is-selected' : ''}" 
           title="Klik untuk analisa ${item.full_date}">
        
        <!-- Hover Badge / Top Value -->
        <span class="text-[10px] font-bold ${isPeak ? 'text-[#0038d2]' : 'text-slate-500'} group-hover:text-[#0038d2] transition leading-none mb-1">
          ${isPeak ? '★ ' : ''}${item.trans_this_week}
        </span>

        <!-- Group of 2 Clustered Bars -->
        <div class="w-full flex items-end justify-center gap-1.5 h-32 px-0.5">
          <!-- Bar 1: Minggu Ini (Blue) -->
          <div class="bar-this-week flex-1 bg-[#0038d2] hover:bg-[#0028a0] rounded-t-lg transition-all ${isSelected ? 'ring-2 ring-offset-1 ring-[#0038d2]' : ''}" 
               style="height: ${hThisWeek}px;" 
               title="Minggu ini: ${item.trans_this_week} transaksi"></div>

          <!-- Bar 2: Minggu Lalu (Gray/Slate) -->
          <div class="bar-last-week flex-1 bg-[#cbd5e1] hover:bg-[#94a3b8] rounded-t-lg transition-all ${isSelected ? 'ring-2 ring-offset-1 ring-slate-400' : ''}" 
               style="height: ${hLastWeek}px;" 
               title="Minggu lalu: ${item.trans_last_week} transaksi"></div>
        </div>

        <!-- Day Label -->
        <span class="text-[11px] font-bold ${isPeak ? 'text-[#0038d2] font-black' : 'text-slate-600'} mt-1">
          ${item.day}
        </span>
      </div>
    `;
  }).join('');
}

// 3. User clicks any bar on Ringkasan
function selectDay(dayCode) {
  if (!ringkasanData || !ringkasanData.daily_data) return;

  const dayItem = ringkasanData.daily_data.find(d => d.day.toLowerCase() === dayCode.toLowerCase());
  if (!dayItem) return;

  selectedDay = dayItem.day;

  // Add selection styling
  const revCont = document.getElementById('container-daily-rev');
  const clusterCont = document.getElementById('container-clustered-bars');
  if (revCont) revCont.classList.add('has-selection');
  if (clusterCont) clusterCont.classList.add('has-selection');

  // Re-render bars to apply is-selected class
  renderDailyRevBars(ringkasanData.daily_data);
  renderClusteredBars(ringkasanData.daily_data);

  // Update Drilldown Banner
  const drilldown = document.getElementById('ringkasan-drilldown');
  if (drilldown) {
    drilldown.classList.remove('hidden');
    document.getElementById('dd-day-badge').innerText = dayItem.day.toUpperCase();
    document.getElementById('dd-day-title').innerText = `${dayItem.full_date} ${dayItem.peak ? '(⭐ Puncak Mingguan)' : ''}`;
    document.getElementById('dd-omzet').innerText = `Rp${dayItem.revenue.toLocaleString('id-ID')}`;
    
    const diffTrx = dayItem.trans_this_week - dayItem.trans_last_week;
    const diffSign = diffTrx >= 0 ? `+${diffTrx}` : `${diffTrx}`;
    document.getElementById('dd-transaksi').innerText = `${dayItem.trans_this_week} pesanan (${diffSign} vs minggu lalu)`;
    document.getElementById('dd-top-menu').innerText = `${dayItem.top_menu} (${dayItem.top_menu_qty || 'Paling Laris'})`;
    document.getElementById('dd-ratio').innerText = `${dayItem.dine_in_pct}% Di cafe / ${dayItem.takeaway_pct}% Takeaway`;
  }

  // Update left card revenue header
  const revVal = document.getElementById('rev-card-val');
  const revSub = document.getElementById('rev-card-sub');
  if (revVal) revVal.innerText = `Rp${(dayItem.revenue / 1000000).toFixed(2).replace('.', ',')} jt`;
  if (revSub) revSub.innerText = `pada hari ${dayItem.day}`;

  const revFooter = document.getElementById('rev-footer-stat');
  if (revFooter) revFooter.innerText = `Rp${dayItem.revenue.toLocaleString('id-ID')}`;

  // Update bottom stats in ramainya minggu ini
  const statAvg = document.getElementById('cluster-stat-avg');
  if (statAvg) statAvg.innerText = dayItem.avg_basket;

  const statPeak = document.getElementById('cluster-stat-peak');
  if (statPeak) statPeak.innerText = `${dayItem.full_date.split(',')[0]} · ${dayItem.trans_this_week} trx`;

  const diff = dayItem.trans_this_week - dayItem.trans_last_week;
  const pctDiff = ((diff / dayItem.trans_last_week) * 100).toFixed(1);
  const statGrowth = document.getElementById('cluster-stat-growth');
  if (statGrowth) {
    statGrowth.innerText = diff >= 0 ? `+${diff} trx (+${pctDiff}%)` : `${diff} trx (${pctDiff}%)`;
  }

  showToast(`📊 Terpilih: ${dayItem.full_date} (Omzet: Rp${dayItem.revenue.toLocaleString('id-ID')} · ${dayItem.trans_this_week} transaksi)`);
  lucide.createIcons();
}

// 4. Reset Day Selection back to 7 Days
function resetDaySelection() {
  selectedDay = null;

  const revCont = document.getElementById('container-daily-rev');
  const clusterCont = document.getElementById('container-clustered-bars');
  if (revCont) revCont.classList.remove('has-selection');
  if (clusterCont) clusterCont.classList.remove('has-selection');

  const drilldown = document.getElementById('ringkasan-drilldown');
  if (drilldown) drilldown.classList.add('hidden');

  if (ringkasanData) {
    renderDailyRevBars(ringkasanData.daily_data);
    renderClusteredBars(ringkasanData.daily_data);

    const revVal = document.getElementById('rev-card-val');
    const revSub = document.getElementById('rev-card-sub');
    if (revVal) revVal.innerText = 'Rp18,48 jt';
    if (revSub) revSub.innerText = 'dalam 7 hari';

    const revFooter = document.getElementById('rev-footer-stat');
    if (revFooter) revFooter.innerText = 'Rp2.640.000';

    const statAvg = document.getElementById('cluster-stat-avg');
    if (statAvg) statAvg.innerText = 'Rp30.000';

    const statPeak = document.getElementById('cluster-stat-peak');
    if (statPeak) statPeak.innerText = 'Sabtu · 120 trx';

    const statGrowth = document.getElementById('cluster-stat-growth');
    if (statGrowth) statGrowth.innerText = '+56 dari minggu lalu';
  }

  showToast('Menampilkan kembali ringkasan kumulatif 7 hari');
  lucide.createIcons();
}

// 5. Reactive Filter Change (Branch & Period)
function filterRingkasanData() {
  const branch = document.getElementById('ringkasan-filter-branch').value;
  const period = document.getElementById('ringkasan-filter-date').value;

  resetDaySelection();

  if (!ringkasanData) return;

  let multiplier = 1.0;
  if (branch.includes('Kledokan') || branch === 'Cabang Dago') multiplier = 0.88;
  else if (branch.includes('Bantul') || branch === 'Cabang Sudirman') multiplier = 0.12;

  if (period === 'prev') multiplier *= 0.89;
  else if (period === 'month') multiplier *= 4.1;

  const totalRev = Math.round(18480000 * multiplier);
  const laba = Math.round(totalRev * 0.6);
  const totalTrx = Math.round(616 * multiplier);
  const totalMenu = Math.round(840 * multiplier);

  document.getElementById('rkpi-pendapatan').innerText = `Rp${totalRev.toLocaleString('id-ID')}`;
  document.getElementById('rkpi-laba').innerText = `Rp${laba.toLocaleString('id-ID')}`;
  document.getElementById('rkpi-transaksi').innerText = totalTrx.toLocaleString('id-ID');
  document.getElementById('rkpi-menu').innerText = totalMenu.toLocaleString('id-ID');

  // Scale daily bars
  const scaledDaily = ringkasanData.daily_data.map(item => ({
    ...item,
    revenue: Math.round(item.revenue * multiplier),
    revenue_label: `${((item.revenue * multiplier) / 1000000).toFixed(2).replace('.', ',')} jt`,
    trans_this_week: Math.round(item.trans_this_week * (multiplier > 2 ? multiplier / 4 : multiplier)),
    trans_last_week: Math.round(item.trans_last_week * (multiplier > 2 ? multiplier / 4 : multiplier))
  }));

  renderDailyRevBars(scaledDaily);
  renderClusteredBars(scaledDaily);

  showToast(`⚡ Data diperbarui untuk: ${branch}`);
  lucide.createIcons();
}

// 6. Interactive Order Source (Dine-in vs Takeaway)
function selectOrderSource(type) {
  const barDinein = document.getElementById('bar-dinein');
  if (type === 'dinein') {
    if (barDinein) barDinein.style.width = '100%';
    showToast('🍽️ Pesanan Di Cafe: 65% (Rp12.012.000) &bull; Rata-rata 2–3 orang per meja');
  } else {
    if (barDinein) barDinein.style.width = '0%';
    showToast('🛍️ Pesanan Bawa Pulang: 35% (Rp6.468.000) &bull; Pembeli cepat / tumbler');
  }

  setTimeout(() => {
    if (barDinein) barDinein.style.width = '65%';
  }, 2200);
}

// =============================================================================
// CRM / MEMBER SECTION LOGIC
// =============================================================================

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

// Download & Export Report (PDF, XLSX, CSV)
function downloadReport(type = 'penjualan', format = 'pdf', btnElement = null) {
  let filename = '';
  let docTitle = '';

  if (type === 'penjualan') {
    filename = `Laporan_Penjualan_SantaiKawan_Nov2026.${format}`;
    docTitle = 'Laporan Penjualan Lengkap';
  } else if (type === 'labarugi') {
    filename = `Laporan_Laba_Rugi_HPP_SantaiKawan_Nov2026.${format}`;
    docTitle = 'Laporan Laba Rugi & HPP';
  } else if (type === 'menu') {
    filename = `Laporan_Performa_Menu_SantaiKawan_Nov2026.${format}`;
    docTitle = 'Laporan Performa Menu';
  } else if (type === 'member') {
    filename = `Laporan_CRM_Member_SantaiKawan_Nov2026.${format}`;
    docTitle = 'Laporan Member & 4 Segmen CRM';
  } else {
    filename = `Laporan_Penjualan_SantaiKawan_Nov2026.${format}`;
    docTitle = 'Laporan Finansial Santai Kawan';
  }

  // Visual UI button feedback
  let originalHTML = '';
  if (btnElement) {
    originalHTML = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.classList.add('opacity-80', 'cursor-wait');
    btnElement.innerHTML = `
      <svg class="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-current inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Mengunduh...</span>
    `;
  }

  showToast(`📥 Menyiapkan ${docTitle} (${format.toUpperCase()})...`);

  // Trigger browser download via native anchor
  setTimeout(() => {
    try {
      const downloadUrl = `/downloads/${filename}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Success feedback
      setTimeout(() => {
        if (btnElement) {
          btnElement.innerHTML = `
            <svg class="w-3.5 h-3.5 text-emerald-500 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Terunduh!</span>
          `;
        }
        showToast(`✅ Berhasil mengunduh ${filename}`);

        setTimeout(() => {
          if (btnElement) {
            btnElement.disabled = false;
            btnElement.classList.remove('opacity-80', 'cursor-wait');
            btnElement.innerHTML = originalHTML;
            if (window.lucide) lucide.createIcons();
          }
        }, 1400);
      }, 400);

    } catch (err) {
      console.error('Download error:', err);
      // Fallback to direct navigation / API
      window.location.href = `/api/export?type=${type}&format=${format}`;
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.classList.remove('opacity-80', 'cursor-wait');
        btnElement.innerHTML = originalHTML;
      }
    }
  }, 350);
}

// Export Report legacy alias
function exportReport(type = 'penjualan', format = 'pdf') {
  downloadReport(type, format);
}

// Notification Dropdown Panel
function toggleNotifications(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('dropdown-notifications');
  if (!dropdown) return;

  const isHidden = dropdown.classList.contains('hidden');
  if (isHidden) {
    dropdown.classList.remove('hidden');
    lucide.createIcons();
  } else {
    dropdown.classList.add('hidden');
  }
}

function closeNotifications() {
  const dropdown = document.getElementById('dropdown-notifications');
  if (dropdown) dropdown.classList.add('hidden');
}

function markAllNotificationsAsRead() {
  const badgeDot = document.getElementById('badge-notif-dot');
  const badgeCount = document.getElementById('badge-notif-count');
  if (badgeDot) badgeDot.classList.add('hidden');
  if (badgeCount) {
    badgeCount.innerText = '0 Baru';
    badgeCount.className = 'bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full';
  }
  showToast('✓ Semua notifikasi telah ditandai dibaca.');
}

function filterNotifTab(category) {
  const tabs = {
    'all': document.getElementById('btn-notif-tab-all'),
    'warning': document.getElementById('btn-notif-tab-warning'),
    'crm': document.getElementById('btn-notif-tab-crm')
  };

  Object.keys(tabs).forEach(k => {
    const btn = tabs[k];
    if (btn) {
      if (k === category) {
        btn.className = 'px-3 py-1 rounded-full bg-[#0038d2] text-white shadow-2xs';
      } else {
        btn.className = 'px-3 py-1 rounded-full text-slate-600 hover:text-slate-900';
      }
    }
  });

  const items = document.querySelectorAll('.notif-item');
  items.forEach(el => {
    if (category === 'all') {
      el.classList.remove('hidden');
    } else if (category === 'warning') {
      if (el.classList.contains('notif-warning')) el.classList.remove('hidden');
      else el.classList.add('hidden');
    } else if (category === 'crm') {
      if (el.classList.contains('notif-crm')) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  });
}

// Click outside or Escape to close notification dropdown
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('dropdown-notifications');
  const trigger = document.getElementById('btn-notification-trigger');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeNotifications();
  }
});

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

// =============================================================================
// INVENTORI & PUSAT LOGISTIK (HALAMAN 40 PROTOTYPE)
// =============================================================================

async function loadInventori() {
  try {
    const res = await fetch('/api/inventori');
    if (!res.ok) throw new Error('Gagal memuat inventori');
    const data = await res.json();
    inventoriList = data.items || [];
    renderInventoriTable(inventoriList);
  } catch (err) {
    console.error('Error fetching inventori:', err);
  }
}

function renderInventoriTable(items) {
  const tbody = document.getElementById('inventori-table-body');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-slate-400">
          Tidak ada bahan baku yang cocok dengan filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(item => {
    let statusBadge = '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Aman</span>';
    let stockClass = 'text-slate-800 font-bold';

    if (item.status && item.status.toLowerCase().includes('kritis')) {
      statusBadge = '<span class="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Kritis (&lt;2 hari)</span>';
      stockClass = 'text-red-600 font-bold';
    } else if (item.status && item.status.toLowerCase().includes('menipis')) {
      statusBadge = '<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Menipis</span>';
      stockClass = 'text-amber-600 font-bold';
    }

    const safeSupplier = (item.supplier || '').replace(/'/g, "\\'");
    const safeName = (item.name || '').replace(/'/g, "\\'");
    const safeCode = (item.code || '').replace(/'/g, "\\'");
    const safeUnit = (item.unit || '').replace(/'/g, "\\'");

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-3 pl-4 font-mono font-bold text-slate-800">${item.code}</td>
        <td class="p-3">
          <div class="font-bold text-slate-900">${item.name}</div>
          <div class="text-[11px] text-slate-400">Supplier: ${item.supplier || '-'}</div>
        </td>
        <td class="p-3 text-slate-600">${item.category || 'Bahan Baku'}</td>
        <td class="p-3 ${stockClass}">${item.stock}</td>
        <td class="p-3">${statusBadge}</td>
        <td class="p-3 pr-4 text-right">
          <button onclick="openRestockModalFor('${safeCode}', '${safeName}', '${safeUnit}', '${safeSupplier}')" class="px-3 py-1 bg-blue-50 hover:bg-[#0038d2] text-[#0038d2] hover:text-white rounded-full font-bold text-[11px] transition inline-flex items-center gap-1 active:scale-95 shadow-2xs">
            <i data-lucide="plus" class="w-3 h-3"></i>
            <span>+ Tambah</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

function setInventoriCategory(category) {
  selectedInvCategory = category;
  const categories = ['Semua', 'Kopi & Biji', 'Susu & Dairy', 'Sirup & Gula', 'Kemasan'];
  categories.forEach(cat => {
    const btn = document.getElementById(`btn-inv-cat-${cat}`);
    if (btn) {
      if (cat === category) {
        btn.className = 'px-3.5 py-1 rounded-full bg-[#0038d2] text-white';
      } else {
        btn.className = 'px-3 py-1 rounded-full text-slate-600 hover:text-slate-900';
      }
    }
  });
  filterInventori();
}

function filterInventori() {
  const searchInput = document.getElementById('inventori-search');
  const statusSelect = document.getElementById('inventori-status-filter');
  const search = searchInput ? searchInput.value.toLowerCase() : '';
  const status = statusSelect ? statusSelect.value : 'Semua';

  const filtered = inventoriList.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search) ||
                        item.code.toLowerCase().includes(search) ||
                        (item.supplier && item.supplier.toLowerCase().includes(search));
    
    let matchCat = true;
    if (selectedInvCategory !== 'Semua') {
      matchCat = item.category.toLowerCase().includes(selectedInvCategory.toLowerCase());
    }

    let matchStatus = true;
    if (status === 'Kritis') matchStatus = item.status && item.status.includes('Kritis');
    else if (status === 'Menipis') matchStatus = item.status && item.status.includes('Menipis');
    else if (status === 'Aman') matchStatus = item.status && item.status.includes('Aman');

    return matchSearch && matchCat && matchStatus;
  });

  renderInventoriTable(filtered);
}

// =============================================================================
// RIWAYAT STOK (KARTU MUTASI GUDANG)
// =============================================================================

function openStockHistoryModal() {
  const modal = document.getElementById('modal-stock-history');
  if (modal) {
    modal.classList.remove('hidden');
    loadStockHistory();
  }
}

function closeStockHistoryModal() {
  const modal = document.getElementById('modal-stock-history');
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function loadStockHistory() {
  try {
    const res = await fetch('/api/inventori/history');
    if (!res.ok) throw new Error('Gagal memuat riwayat stok');
    stockHistoryList = await res.json();
    renderStockHistory(stockHistoryList);
  } catch (err) {
    console.error('Error fetching stock history:', err);
  }
}

function filterHistoryTab(type) {
  activeHistTab = type;
  const tabs = {
    'all': document.getElementById('btn-hist-all'),
    'Masuk': document.getElementById('btn-hist-masuk'),
    'Keluar': document.getElementById('btn-hist-keluar')
  };

  Object.keys(tabs).forEach(k => {
    const btn = tabs[k];
    if (btn) {
      if (k === type) {
        btn.className = 'px-4 py-1.5 rounded-full bg-white text-slate-900 shadow-xs';
      } else {
        btn.className = 'px-4 py-1.5 rounded-full text-slate-600 hover:text-slate-900';
      }
    }
  });

  searchHistoryList();
}

function searchHistoryList() {
  const searchInput = document.getElementById('input-search-history');
  const query = searchInput ? searchInput.value.toLowerCase() : '';

  let filtered = stockHistoryList;
  if (activeHistTab !== 'all') {
    filtered = filtered.filter(h => h.type === activeHistTab);
  }

  if (query) {
    filtered = filtered.filter(h => 
      h.id.toLowerCase().includes(query) ||
      h.name.toLowerCase().includes(query) ||
      h.code.toLowerCase().includes(query) ||
      (h.pic && h.pic.toLowerCase().includes(query)) ||
      (h.notes && h.notes.toLowerCase().includes(query))
    );
  }

  renderStockHistory(filtered);
}

function renderStockHistory(history) {
  const tbody = document.getElementById('stock-history-table-body');
  if (!tbody) return;

  if (history.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-8 text-center text-slate-400">
          Belum ada riwayat mutasi stok yang sesuai.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = history.map(h => {
    const isMasuk = h.type === 'Masuk';
    const typeBadge = isMasuk
      ? '<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full"><i data-lucide="arrow-down-left" class="w-3 h-3"></i>Masuk</span>'
      : '<span class="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full"><i data-lucide="arrow-up-right" class="w-3 h-3"></i>Keluar</span>';

    const qtyClass = isMasuk ? 'text-emerald-700 font-bold' : 'text-slate-700 font-bold';

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-3 pl-4 font-mono font-bold text-slate-800">${h.id}</td>
        <td class="p-3 text-[11px] text-slate-500 whitespace-nowrap">${h.date}</td>
        <td class="p-3">
          <div class="font-bold text-slate-900">${h.name}</div>
          <div class="text-[10px] font-mono text-slate-400">${h.code}</div>
        </td>
        <td class="p-3 text-center">${typeBadge}</td>
        <td class="p-3 text-right ${qtyClass}">${h.qty}</td>
        <td class="p-3 text-right font-bold text-slate-900">${h.balance}</td>
        <td class="p-3 text-slate-700 font-medium">${h.pic || '-'}</td>
        <td class="p-3 pr-4 text-slate-500 text-[11px]">${h.notes || '-'}</td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

// =============================================================================
// RESTOCK / CATAT BAHAN MASUK (HALAMAN 5 PROTOTYPE)
// =============================================================================

let currentRestockTab = 'hpp';

function openRestockModal() {
  const modal = document.getElementById('modal-restock');
  if (modal) {
    modal.classList.remove('hidden');
    document.getElementById('restock-modal-title').innerText = 'Catat Pengadaan & Bahan Masuk';
    document.getElementById('form-restock').reset();
    document.getElementById('restock-select-item').value = '';
    document.getElementById('restock-code').value = '';
    document.getElementById('restock-name').value = '';
    document.getElementById('restock-qty').value = '';
    switchRestockTab('hpp');
    calcRestockHpp();
  }
}

function openRestockModalFor(code, name, unit, supplier) {
  openRestockModal();
  document.getElementById('restock-modal-title').innerText = `Restock: ${name}`;
  
  const selectEl = document.getElementById('restock-select-item');
  if (selectEl) {
    selectEl.value = code || 'custom';
  }
  document.getElementById('restock-code').value = code || '';
  document.getElementById('restock-name').value = name || '';
  if (unit) document.getElementById('restock-unit').value = unit;
  if (supplier) document.getElementById('restock-supplier').value = supplier;
  
  setTimeout(() => {
    const qtyInput = document.getElementById('restock-qty');
    if (qtyInput) qtyInput.focus();
  }, 100);
}

function closeRestockModal() {
  const modal = document.getElementById('modal-restock');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function switchRestockTab(tabName) {
  currentRestockTab = tabName;
  const panelHpp = document.getElementById('panel-restock-hpp');
  const panelStorage = document.getElementById('panel-restock-storage');
  const panelSupplier = document.getElementById('panel-restock-supplier');
  const btnHpp = document.getElementById('tab-btn-restock-hpp');
  const btnStorage = document.getElementById('tab-btn-restock-storage');
  const btnSupplier = document.getElementById('tab-btn-restock-supplier');
  const btnPrev = document.getElementById('btn-restock-prev');
  const btnNext = document.getElementById('btn-restock-next');

  // Hide all panels
  if (panelHpp) panelHpp.classList.add('hidden');
  if (panelStorage) panelStorage.classList.add('hidden');
  if (panelSupplier) panelSupplier.classList.add('hidden');

  // Reset button styles
  const inactiveClass = 'pb-2.5 px-3 text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition';
  const activeClass = 'pb-2.5 px-3 border-b-2 border-[#0038d2] text-[#0038d2] flex items-center gap-1.5 transition';
  if (btnHpp) btnHpp.className = inactiveClass;
  if (btnStorage) btnStorage.className = inactiveClass;
  if (btnSupplier) btnSupplier.className = inactiveClass;

  if (tabName === 'hpp') {
    if (panelHpp) panelHpp.classList.remove('hidden');
    if (btnHpp) btnHpp.className = activeClass;
    if (btnPrev) btnPrev.classList.add('hidden');
    if (btnNext) btnNext.classList.remove('hidden');
  } else if (tabName === 'storage') {
    if (panelStorage) panelStorage.classList.remove('hidden');
    if (btnStorage) btnStorage.className = activeClass;
    if (btnPrev) btnPrev.classList.remove('hidden');
    if (btnNext) btnNext.classList.remove('hidden');
  } else if (tabName === 'supplier') {
    if (panelSupplier) panelSupplier.classList.remove('hidden');
    if (btnSupplier) btnSupplier.className = activeClass;
    if (btnPrev) btnPrev.classList.remove('hidden');
    if (btnNext) btnNext.classList.add('hidden');
  }

  lucide.createIcons();
}

function navRestockTab(dir) {
  const tabs = ['hpp', 'storage', 'supplier'];
  const currentIndex = tabs.indexOf(currentRestockTab);
  const nextIndex = currentIndex + dir;
  if (nextIndex >= 0 && nextIndex < tabs.length) {
    switchRestockTab(tabs[nextIndex]);
  }
}

function calcRestockHpp() {
  const priceInput = document.getElementById('restock-price');
  const fakturEl = document.getElementById('calc-restock-faktur');
  const perUnitEl = document.getElementById('calc-restock-per-unit');
  const portionEl = document.getElementById('calc-restock-portion');
  const unitSelect = document.getElementById('restock-unit');

  if (!priceInput || !fakturEl) return;

  const rawPrice = parseFloat(priceInput.value.replace(/[^0-9]/g, '')) || 42000;
  const unit = unitSelect ? unitSelect.value : 'L';

  fakturEl.innerText = `Rp${rawPrice.toLocaleString('id-ID')} / ${unit}`;

  let perUnitVal = 0;
  let portionVal = 0;
  if (unit === 'L') {
    perUnitVal = Math.round(rawPrice / 1000);
    portionVal = perUnitVal * 200; // 200ml porsi racikan latte / sawan
    perUnitEl.innerText = `Rp${perUnitVal} / ml`;
    portionEl.innerText = `Rp${portionVal.toLocaleString('id-ID')} / 200ml`;
  } else if (unit === 'kg') {
    perUnitVal = Math.round(rawPrice / 1000);
    portionVal = perUnitVal * 18; // 18gr espresso
    perUnitEl.innerText = `Rp${perUnitVal} / gram`;
    portionEl.innerText = `Rp${portionVal.toLocaleString('id-ID')} / 18gr`;
  } else {
    perUnitVal = rawPrice;
    portionVal = rawPrice;
    perUnitEl.innerText = `Rp${perUnitVal.toLocaleString('id-ID')} / ${unit}`;
    portionEl.innerText = `Rp${portionVal.toLocaleString('id-ID')} / porsi`;
  }
}

function onRestockItemSelect(val) {
  const selectEl = document.getElementById('restock-select-item');
  if (!selectEl) return;

  if (val === 'custom' || val === '') {
    document.getElementById('restock-code').value = '';
    document.getElementById('restock-name').value = '';
    return;
  }

  const selectedOpt = selectEl.options[selectEl.selectedIndex];
  if (selectedOpt) {
    document.getElementById('restock-code').value = val;
    document.getElementById('restock-name').value = selectedOpt.dataset.name || '';
    if (selectedOpt.dataset.unit) {
      document.getElementById('restock-unit').value = selectedOpt.dataset.unit;
    }
    if (selectedOpt.dataset.supplier) {
      document.getElementById('restock-supplier').value = selectedOpt.dataset.supplier;
    }
  }
  calcRestockHpp();
}

async function submitRestock(e) {
  e.preventDefault();
  const code = document.getElementById('restock-code').value.trim();
  const name = document.getElementById('restock-name').value.trim();
  const qty = document.getElementById('restock-qty').value.trim();
  const unit = document.getElementById('restock-unit').value;
  const price = document.getElementById('restock-price').value.trim();
  
  // Storage tab fields
  const storage_loc = document.getElementById('restock-location') ? document.getElementById('restock-location').value : 'Chiller Bar';
  const min_stock = document.getElementById('restock-min-stock') ? document.getElementById('restock-min-stock').value.trim() : '';
  const condition = document.getElementById('restock-condition') ? document.getElementById('restock-condition').value : '';
  const exp_date = document.getElementById('restock-exp-date') ? document.getElementById('restock-exp-date').value : '';
  const storage_notes = document.getElementById('restock-storage-notes') ? document.getElementById('restock-storage-notes').value.trim() : '';
  
  // Supplier tab fields
  const supplier = document.getElementById('restock-supplier').value.trim();
  const pic = document.getElementById('restock-pic').value.trim();
  const notes = document.getElementById('restock-notes').value.trim();
  const pay_method = document.getElementById('restock-pay-method') ? document.getElementById('restock-pay-method').value : '';
  const qc_note = document.getElementById('restock-qc-note') ? document.getElementById('restock-qc-note').value.trim() : '';

  if (!name || !qty) {
    alert('Nama bahan dan jumlah wajib diisi!');
    return;
  }

  try {
    const res = await fetch('/api/inventori/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        name,
        qty,
        unit,
        price,
        storage_loc,
        min_stock,
        condition,
        exp_date,
        storage_notes,
        supplier,
        pic,
        notes: notes || `Restock gudang (${storage_loc})`,
        pay_method,
        qc_note
      })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Gagal mencatat bahan masuk');
      return;
    }

    const data = await res.json();
    closeRestockModal();
    showToast(`✓ Berhasil mencatat ${qty} ${unit} ${name}! Saldo stok telah diperbarui.`);

    // Refresh inventori table and history
    loadInventori();
    if (stockHistoryList.length > 0) {
      loadStockHistory();
    }
  } catch (err) {
    console.error('Error submitting restock:', err);
    alert('Gagal menghubungi server.');
  }
}

// =============================================================================
// KATALOG HIDANGAN & RACIKAN MENU (HALAMAN 39 PROTOTYPE)
// =============================================================================

async function loadMenu() {
  try {
    const res = await fetch('/api/menu');
    if (!res.ok) throw new Error('Gagal memuat katalog menu');
    const data = await res.json();
    menuList = data.items || [];

    if (data.kpi) {
      const tm = document.getElementById('kpi-total-menu');
      if (tm) tm.innerText = data.kpi.total_menu || `${menuList.length} Sajian`;
      const mt = document.getElementById('kpi-menu-terlaris');
      if (mt) mt.innerText = data.kpi.terlaris || 'Sawan';
      const mm = document.getElementById('kpi-menu-margin');
      if (mm) mm.innerText = data.kpi.margin || '68,5%';
    }

    renderMenuGrid(menuList);
  } catch (err) {
    console.error('Error fetching menu catalog:', err);
  }
}

function renderMenuGrid(items) {
  const container = document.getElementById('menu-grid-container');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-10 text-center text-slate-400 bg-white rounded-3xl border border-slate-100">
        Belum ada menu yang sesuai dengan pencarian atau filter.
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    let catBadgeColor = 'bg-slate-100 text-slate-700';
    if (item.category && item.category.toLowerCase().includes('signature')) {
      catBadgeColor = 'bg-[#eff4fc] text-[#0038d2]';
    } else if (item.category && item.category.toLowerCase().includes('coffee')) {
      catBadgeColor = 'bg-amber-50 text-amber-800';
    } else if (item.category && item.category.toLowerCase().includes('meal')) {
      catBadgeColor = 'bg-orange-50 text-orange-800';
    }

    const isStockSafe = item.stock && item.stock.toLowerCase().includes('aman');
    const stockBadge = isStockSafe
      ? '<span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Bahan aman</span>'
      : '<span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Bahan menipis</span>';

    const imgHtml = item.image_url ? `
      <div class="w-full h-36 rounded-2xl overflow-hidden mb-3 bg-slate-100 shadow-2xs relative">
        <img src="${item.image_url}" alt="${item.name}" class="w-full h-full object-cover">
        ${item.serving_temp ? `<span class="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full">${item.serving_temp}</span>` : ''}
      </div>
    ` : '';

    const descHtml = item.description ? `<p class="text-xs text-slate-500 line-clamp-1 mt-1">${item.description}</p>` : '';

    return `
      <div class="bg-[#f8fafc] p-4 sm:p-5 rounded-3xl border border-slate-100 flex flex-col justify-between hover:border-slate-200 hover:shadow-xs transition">
        <div>
          ${imgHtml}
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold ${catBadgeColor} px-2 py-0.5 rounded-full">${item.category || 'Menu'} &bull; ${item.sku || '-'}</span>
            ${stockBadge}
          </div>
          <h4 class="text-base font-bold text-slate-900 mt-1">${item.name}</h4>
          ${descHtml}
          <div class="flex items-center gap-3 text-xs text-slate-500 mt-2">
            <span>HPP: ${item.hpp || 'Rp8.000'}</span>
            <span>&bull;</span>
            <span class="text-[#00875a] font-bold">Margin ${item.margin || '65%'}</span>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
          <span class="text-sm font-extrabold text-slate-900">${item.price}</span>
          <span class="text-xs text-slate-500 font-medium">${item.sold || 0} terjual</span>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function setMenuCategory(cat) {
  selectedMenuCategory = cat;
  const cats = ['Semua', 'Signature', 'Coffee', 'Meals'];
  cats.forEach(c => {
    const btn = document.getElementById(`btn-menu-cat-${c}`);
    if (btn) {
      if (c === cat) {
        btn.className = 'px-3.5 py-1 rounded-full bg-[#0038d2] text-white';
      } else {
        btn.className = 'px-3 py-1 rounded-full text-slate-600 hover:text-slate-900';
      }
    }
  });
  filterMenuCatalog();
}

function filterMenuCatalog() {
  const searchInput = document.getElementById('menu-search-input');
  const search = searchInput ? searchInput.value.toLowerCase() : '';

  const filtered = menuList.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search) ||
                        (item.sku && item.sku.toLowerCase().includes(search)) ||
                        (item.category && item.category.toLowerCase().includes(search));

    let matchCat = true;
    if (selectedMenuCategory === 'Signature') matchCat = item.category && item.category.includes('Signature');
    else if (selectedMenuCategory === 'Coffee') matchCat = item.category && item.category.includes('Coffee');
    else if (selectedMenuCategory === 'Meals') matchCat = item.category && (item.category.includes('Meal') || item.category.includes('Snack') || item.category.includes('Pastry'));

    return matchSearch && matchCat;
  });

  renderMenuGrid(filtered);
}

// Modal Add Menu
function openAddMenuModal() {
  const modal = document.getElementById('modal-add-menu');
  if (modal) {
    modal.classList.remove('hidden');
    document.getElementById('form-add-menu').reset();
    switchAddMenuTab('hpp');
    const preview = document.getElementById('preview-menu-img');
    const inputUrl = document.getElementById('input-menu-image-url');
    if (preview) preview.src = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80';
    if (inputUrl) inputUrl.value = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80';
    autoGenerateSku();
    calcMenuMargin();
  }
}

function closeAddMenuModal() {
  const modal = document.getElementById('modal-add-menu');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function switchAddMenuTab(tabName) {
  const panelHpp = document.getElementById('panel-menu-hpp');
  const panelInfo = document.getElementById('panel-menu-info');
  const btnHpp = document.getElementById('tab-btn-menu-hpp');
  const btnInfo = document.getElementById('tab-btn-menu-info');
  const btnPrev = document.getElementById('btn-menu-prev');
  const btnNext = document.getElementById('btn-menu-next');

  if (tabName === 'hpp') {
    if (panelHpp) panelHpp.classList.remove('hidden');
    if (panelInfo) panelInfo.classList.add('hidden');
    if (btnHpp) btnHpp.className = 'pb-2.5 px-3 border-b-2 border-[#0038d2] text-[#0038d2] flex items-center gap-1.5 transition';
    if (btnInfo) btnInfo.className = 'pb-2.5 px-3 text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition';
    if (btnPrev) btnPrev.classList.add('hidden');
    if (btnNext) btnNext.classList.remove('hidden');
  } else {
    if (panelHpp) panelHpp.classList.add('hidden');
    if (panelInfo) panelInfo.classList.remove('hidden');
    if (btnInfo) btnInfo.className = 'pb-2.5 px-3 border-b-2 border-[#0038d2] text-[#0038d2] flex items-center gap-1.5 transition';
    if (btnHpp) btnHpp.className = 'pb-2.5 px-3 text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition';
    if (btnPrev) btnPrev.classList.remove('hidden');
    if (btnNext) btnNext.classList.add('hidden');
  }

  lucide.createIcons();
}

function handleMenuPhotoUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const dataUrl = evt.target.result;
    const preview = document.getElementById('preview-menu-img');
    const inputUrl = document.getElementById('input-menu-image-url');
    if (preview) preview.src = dataUrl;
    if (inputUrl) inputUrl.value = dataUrl;
    showToast('✓ Foto sajian berhasil diunggah!');
  };
  reader.readAsDataURL(file);
}

function setPresetMenuPhoto(url, name) {
  const preview = document.getElementById('preview-menu-img');
  const inputUrl = document.getElementById('input-menu-image-url');
  if (preview) preview.src = url;
  if (inputUrl) inputUrl.value = url;
  showToast(`✓ Foto preset ${name} dipilih.`);
}

function autoGenerateSku() {
  const cat = document.getElementById('input-menu-category').value;
  let prefix = 'SIG';
  if (cat.includes('Coffee')) prefix = 'COF';
  else if (cat.includes('Tea')) prefix = 'TEA';
  else if (cat.includes('Meal')) prefix = 'MEL';
  else if (cat.includes('Snack')) prefix = 'SNK';

  const count = menuList.length + 1;
  const skuInput = document.getElementById('input-menu-sku');
  if (skuInput) {
    skuInput.value = `${prefix}-${count.toString().padStart(2, '0')}`;
  }
}

function calcMenuMargin() {
  const priceInput = document.getElementById('input-menu-price');
  const hppInput = document.getElementById('input-menu-hpp');
  const marginDisplay = document.getElementById('display-menu-margin');

  if (!priceInput || !hppInput || !marginDisplay) return;

  const price = parseFloat(priceInput.value) || 0;
  const hpp = parseFloat(hppInput.value) || 0;

  if (price > 0 && hpp >= 0) {
    const margin = (((price - hpp) / price) * 100).toFixed(1);
    const isHealthy = margin >= 60;
    marginDisplay.innerHTML = `
      <span>${margin}%</span>
      <span class="text-[10px] font-bold ${isHealthy ? 'text-emerald-600 bg-emerald-100' : 'text-amber-600 bg-amber-100'} px-1.5 py-0.5 rounded">
        ${isHealthy ? 'Sehat (>60%)' : 'Tipis (<60%)'}
      </span>
    `;
  } else {
    marginDisplay.innerHTML = `<span>65.0%</span><span class="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Sehat</span>`;
  }
}

async function submitNewMenu(e) {
  e.preventDefault();
  const name = document.getElementById('input-menu-name').value.trim();
  const category = document.getElementById('input-menu-category').value;
  const sku = document.getElementById('input-menu-sku').value.trim();
  const price = document.getElementById('input-menu-price').value.trim();
  const hpp = document.getElementById('input-menu-hpp').value.trim();
  const recipe = document.getElementById('input-menu-recipe') ? document.getElementById('input-menu-recipe').value.trim() : '';

  // Tab 2: Informasi & Foto
  const image_url = document.getElementById('input-menu-image-url') ? document.getElementById('input-menu-image-url').value : '';
  const description = document.getElementById('input-menu-desc') ? document.getElementById('input-menu-desc').value.trim() : '';
  const serving_temp = document.getElementById('input-menu-temp') ? document.getElementById('input-menu-temp').value : 'Dingin (Iced)';
  const status = document.getElementById('input-menu-status') ? document.getElementById('input-menu-status').value : 'Aktif di Kasir';
  const prep_time = document.getElementById('input-menu-time') ? document.getElementById('input-menu-time').value : '3–5 Menit';
  const badge = document.getElementById('input-menu-badge') ? document.getElementById('input-menu-badge').value : 'Signature';

  if (!name || !price) {
    alert('Nama menu dan harga jual wajib diisi!');
    return;
  }

  try {
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        category,
        sku,
        price,
        hpp,
        recipe,
        image_url,
        description,
        serving_temp,
        status,
        prep_time,
        badge
      })
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Gagal menambahkan menu baru');
      return;
    }

    const data = await res.json();
    closeAddMenuModal();
    showToast(`✓ Menu ${name} berhasil ditambahkan ke katalog & POS!`);

    // Reload menu catalog
    loadMenu();
  } catch (err) {
    console.error('Error submitting new menu:', err);
    alert('Terjadi kesalahan koneksi.');
  }
}

// ==================== LAPORAN: TARIK DATA KASIR (POS SYNC) ====================

function openSyncKasirModal() {
  const modal = document.getElementById('modal-sync-kasir');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Reset progress and success states
  const progressBox = document.getElementById('sync-progress-box');
  const successBox = document.getElementById('sync-success-box');
  if (progressBox) progressBox.classList.add('hidden');
  if (successBox) successBox.classList.add('hidden');

  const btnText = document.getElementById('btn-execute-sync-text');
  const btnIcon = document.getElementById('btn-execute-sync-icon');
  const btn = document.getElementById('btn-execute-sync');
  if (btn) btn.disabled = false;
  if (btnText) btnText.textContent = 'Tarik Data Sekarang (Sync)';
  if (btnIcon) {
    btnIcon.classList.remove('animate-spin');
    btnIcon.setAttribute('data-lucide', 'refresh-cw');
  }

  lucide.createIcons();
}

function closeSyncKasirModal() {
  const modal = document.getElementById('modal-sync-kasir');
  if (modal) modal.classList.add('hidden');
}

async function executeSyncKasir() {
  const btn = document.getElementById('btn-execute-sync');
  const btnText = document.getElementById('btn-execute-sync-text');
  const btnIcon = document.getElementById('btn-execute-sync-icon');
  const progressBox = document.getElementById('sync-progress-box');
  const progressBar = document.getElementById('sync-progress-bar');
  const progressPct = document.getElementById('sync-progress-pct');
  const progressLabel = document.getElementById('sync-progress-label');
  const successBox = document.getElementById('sync-success-box');

  if (btn) btn.disabled = true;
  if (btnIcon) btnIcon.classList.add('animate-spin');
  if (btnText) btnText.textContent = 'Menghubungkan POS...';

  if (progressBox) progressBox.classList.remove('hidden');
  if (successBox) successBox.classList.add('hidden');

  // Step 1: Connecting
  if (progressBar) progressBar.style.width = '25%';
  if (progressPct) progressPct.textContent = '25%';
  if (progressLabel) progressLabel.textContent = 'Menghubungkan ke API EasyEat & Nuta POS...';

  await new Promise(r => setTimeout(r, 400));

  // Step 2: Fetching
  if (progressBar) progressBar.style.width = '65%';
  if (progressPct) progressPct.textContent = '65%';
  if (progressLabel) progressLabel.textContent = 'Mengambil 616 struk transaksi & settlement QRIS...';

  try {
    const res = await fetch('/api/laporan/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pic: 'Owner Santai Kawan' })
    });

    const result = await res.json();

    // Step 3: Complete
    if (progressBar) progressBar.style.width = '100%';
    if (progressPct) progressPct.textContent = '100%';
    if (progressLabel) progressLabel.textContent = 'Rekonsiliasi selesai 100%! Data terverifikasi.';

    await new Promise(r => setTimeout(r, 350));

    if (progressBox) progressBox.classList.add('hidden');
    if (successBox) {
      successBox.classList.remove('hidden');
      const detail = document.getElementById('sync-success-detail');
      if (detail && result.data) {
        detail.textContent = `${result.data.total_transactions} transaksi (${result.data.total_omzet}) telah dicocokkan otomatis pada ${result.data.timestamp}.`;
      }
    }

    if (btnText) btnText.textContent = 'Sinkronisasi Selesai ✓';
    if (btnIcon) {
      btnIcon.classList.remove('animate-spin');
      btnIcon.setAttribute('data-lucide', 'check-circle-2');
    }

    // Update header time indicator
    const lastTime = document.getElementById('sync-last-time');
    if (lastTime && result.data) {
      lastTime.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Terakhir sync: ${result.data.timestamp} · 616 Transaksi Klop</span>
      `;
    }

    showToast('✓ Berhasil menarik 616 transaksi dari POS EasyEat & Nuta POS!');
    lucide.createIcons();
  } catch (err) {
    console.error('Error syncing POS:', err);
    alert('Gagal menyinkronkan data kasir. Silakan coba lagi.');
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Tarik Data Sekarang (Sync)';
    if (btnIcon) btnIcon.classList.remove('animate-spin');
  }
}
