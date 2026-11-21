// State
let dashboardData = null;
let ringkasanData = null;
let membersList = [];
let selectedDay = null;

const PAGES = ['Ringkasan', 'Penjualan', 'Member', 'Menu', 'Inventori', 'Laporan'];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  loadRingkasanData();
  loadMembers();

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
  if (branch === 'Cabang Dago') multiplier = 0.55;
  else if (branch === 'Cabang Sudirman') multiplier = 0.45;

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
