/* ============================================================
   Financiën Tracker – app.js
   ============================================================ */

'use strict';

// ── Constanten ────────────────────────────────────────────────
const STORAGE_KEY = 'financetracker_data';

const MAANDEN = [
  'Januari','Februari','Maart','April','Mei','Juni',
  'Juli','Augustus','September','Oktober','November','December'
];

const STANDAARD_CATEGORIEEN = [
  { id: 'cat_huisvesting',   name: 'Huisvesting',   color: '#6366f1', budget: null },
  { id: 'cat_eten',          name: 'Eten',           color: '#f59e0b', budget: null },
  { id: 'cat_transport',     name: 'Transport',      color: '#3b82f6', budget: null },
  { id: 'cat_gezondheid',    name: 'Gezondheid',     color: '#10b981', budget: null },
  { id: 'cat_entertainment', name: 'Entertainment',  color: '#8b5cf6', budget: null },
  { id: 'cat_salaris',       name: 'Salaris',        color: '#22c55e', budget: null },
  { id: 'cat_freelance',     name: 'Freelance',      color: '#06b6d4', budget: null },
  { id: 'cat_overig',        name: 'Overig',         color: '#94a3b8', budget: null },
];

const VOORBEELD_TRANSACTIES = () => {
  const nu = new Date();
  const jaar = nu.getFullYear();
  const maand = String(nu.getMonth() + 1).padStart(2, '0');
  return [
    { id: uid(), type: 'inkomst', description: 'Maandsalaris', amount: 2800, date: `${jaar}-${maand}-01`, categoryId: 'cat_salaris' },
    { id: uid(), type: 'uitgave', description: 'Huur',         amount: 950,  date: `${jaar}-${maand}-02`, categoryId: 'cat_huisvesting' },
    { id: uid(), type: 'uitgave', description: 'Boodschappen', amount: 180,  date: `${jaar}-${maand}-05`, categoryId: 'cat_eten' },
    { id: uid(), type: 'uitgave', description: 'OV-abonnement',amount: 89,   date: `${jaar}-${maand}-07`, categoryId: 'cat_transport' },
    { id: uid(), type: 'inkomst', description: 'Freelance opdracht', amount: 450, date: `${jaar}-${maand}-10`, categoryId: 'cat_freelance' },
  ];
};

// ── Hulpfuncties ───────────────────────────────────────────────
function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatEuro(amount) {
  return '€\u00a0' + Math.abs(amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDatum(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d} ${MAANDEN[parseInt(m,10)-1].slice(0,3)} ${y}`;
}

function vandaagStr() {
  return new Date().toISOString().slice(0,10);
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// ── Status ────────────────────────────────────────────────────
let state = {
  transactions: [],
  categories: [],
  savingsGoal: { name: '', amount: 0 },
  filterMonth: '',
  filterYear: '',
  filterMonthTx: '',
  filterYearTx: '',
  filterType: '',
  activeTab: 'dashboard',
};

// ── LocalStorage ──────────────────────────────────────────────
function laadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const opgeslagen = JSON.parse(raw);
      state.transactions = opgeslagen.transactions || [];
      state.categories   = opgeslagen.categories   || STANDAARD_CATEGORIEEN.map(c => ({...c}));
      state.savingsGoal  = opgeslagen.savingsGoal  || { name: '', amount: 0 };
    } else {
      // Eerste keer: standaard data
      state.categories  = STANDAARD_CATEGORIEEN.map(c => ({...c}));
      state.transactions = VOORBEELD_TRANSACTIES();
      slaOp();
    }
  } catch(e) {
    console.error('Fout bij laden:', e);
    state.categories  = STANDAARD_CATEGORIEEN.map(c => ({...c}));
    state.transactions = VOORBEELD_TRANSACTIES();
  }
}

function slaOp() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      transactions: state.transactions,
      categories:   state.categories,
      savingsGoal:  state.savingsGoal,
    }));
  } catch(e) {
    toonToast('Fout bij opslaan in lokale opslag.', 'error');
  }
}

// ── Categorie helpers ─────────────────────────────────────────
function getCatById(id) {
  return state.categories.find(c => c.id === id) || null;
}

function getCatName(id) {
  const c = getCatById(id);
  return c ? c.name : 'Onbekend';
}

function getCatColor(id) {
  const c = getCatById(id);
  return c ? c.color : '#94a3b8';
}

// ── Filter helpers ────────────────────────────────────────────
function gefilterd(txs, maand, jaar, type) {
  return txs.filter(tx => {
    const [y, m] = tx.date.split('-');
    if (maand && m !== maand.padStart(2,'0')) return false;
    if (jaar  && y !== jaar)                  return false;
    if (type  && tx.type !== type)            return false;
    return true;
  });
}

function vulFilterOpties() {
  const jaren = [...new Set(state.transactions.map(tx => tx.date.slice(0,4)))].sort().reverse();
  const selectors = [
    { month: '#filterMonth',   year: '#filterYear'   },
    { month: '#filterMonthTx', year: '#filterYearTx' },
  ];
  selectors.forEach(sel => {
    const mSel = qs(sel.month);
    const ySel = qs(sel.year);
    if (!mSel || !ySel) return;
    const huidigM = mSel.value;
    const huidigY = ySel.value;
    mSel.innerHTML = '<option value="">Alle maanden</option>' +
      MAANDEN.map((m,i) => `<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');
    ySel.innerHTML = '<option value="">Alle jaren</option>' +
      jaren.map(j => `<option value="${j}">${j}</option>`).join('');
    mSel.value = huidigM;
    ySel.value = huidigY;
  });
}

// ── Berekeningen ──────────────────────────────────────────────
function berekenTotalen(txs) {
  let inkomsten = 0, uitgaven = 0;
  txs.forEach(tx => {
    if (tx.type === 'inkomst') inkomsten += tx.amount;
    else                       uitgaven  += tx.amount;
  });
  return { inkomsten, uitgaven, netto: inkomsten - uitgaven };
}

function berekenUitgavenPerCategorie(txs) {
  const map = {};
  txs.filter(tx => tx.type === 'uitgave').forEach(tx => {
    map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount;
  });
  return map;
}

function maandelijksTotalen() {
  const kaart = {};
  state.transactions.forEach(tx => {
    const key = tx.date.slice(0,7); // YYYY-MM
    if (!kaart[key]) kaart[key] = { inkomsten: 0, uitgaven: 0 };
    if (tx.type === 'inkomst') kaart[key].inkomsten += tx.amount;
    else                       kaart[key].uitgaven  += tx.amount;
  });
  return kaart;
}

// ── DOM helpers ───────────────────────────────────────────────
function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

// ── Toast ─────────────────────────────────────────────────────
let toastTimer = null;
function toonToast(bericht, type = 'info') {
  const el = qs('#toast');
  el.textContent = bericht;
  el.className = `toast ${type}`;
  el.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

// ── Tabs ──────────────────────────────────────────────────────
function activeerTab(tabId) {
  state.activeTab = tabId;
  qsa('.nav-btn').forEach(btn => {
    const actief = btn.dataset.tab === tabId;
    btn.classList.toggle('active', actief);
    btn.setAttribute('aria-current', actief ? 'page' : 'false');
  });
  qsa('.tab-panel').forEach(panel => {
    const actief = panel.id === `tab-${tabId}`;
    panel.classList.toggle('active', actief);
    panel.hidden = !actief;
  });
  renderHuidigTab();
}

function renderHuidigTab() {
  switch (state.activeTab) {
    case 'dashboard':   renderDashboard();   break;
    case 'transacties': renderTransacties(); break;
    case 'categorieen': renderCategorieen(); break;
    case 'spaardoelen': renderSpaardoelen(); break;
  }
}

// ── Dashboard ────────────────────────────────────────────────
function renderDashboard() {
  const txGefilterd = gefilterd(state.transactions, state.filterMonth, state.filterYear, '');
  const { inkomsten, uitgaven, netto } = berekenTotalen(txGefilterd);
  const spaarPct = inkomsten > 0 ? ((netto / inkomsten) * 100) : 0;

  qs('#totalIncome').textContent   = formatEuro(inkomsten);
  qs('#totalExpenses').textContent = formatEuro(uitgaven);

  const nettoEl = qs('#netBalance');
  nettoEl.textContent = (netto < 0 ? '−\u00a0' : '') + formatEuro(netto);
  nettoEl.style.color = netto < 0 ? 'var(--color-expense)' : netto > 0 ? 'var(--color-income)' : '';

  qs('#savingsRate').textContent = spaarPct.toFixed(1) + '%';

  renderBudgetWaarschuwingen();
  renderBarChart();
  renderDonutChart(txGefilterd);
  renderRecenteTransacties(txGefilterd);
}

function renderBudgetWaarschuwingen() {
  const container = qs('#budgetWarnings');
  container.innerHTML = '';
  const huidigeMaand = String(new Date().getMonth() + 1).padStart(2,'0');
  const huidigJaar   = String(new Date().getFullYear());
  const txDezeM = gefilterd(state.transactions, huidigeMaand, huidigJaar, 'uitgave');
  const uitgavenPerCat = berekenUitgavenPerCategorie(txDezeM);

  state.categories.forEach(cat => {
    if (!cat.budget || cat.budget <= 0) return;
    const besteed = uitgavenPerCat[cat.id] || 0;
    const pct = besteed / cat.budget;
    if (pct >= 1) {
      container.insertAdjacentHTML('beforeend',
        `<div class="budget-warning danger" role="alert">
          🚨 <strong>${cat.name}</strong>: budget overschreden! Besteed ${formatEuro(besteed)} van ${formatEuro(cat.budget)}.
        </div>`);
    } else if (pct >= 0.8) {
      container.insertAdjacentHTML('beforeend',
        `<div class="budget-warning warning" role="alert">
          ⚠️ <strong>${cat.name}</strong>: 80% van budget bereikt. Besteed ${formatEuro(besteed)} van ${formatEuro(cat.budget)}.
        </div>`);
    }
  });
}

// ── Recente transacties ───────────────────────────────────────
function renderRecenteTransacties(txs) {
  const container = qs('#recentTransactions');
  const gesorteerd = [...txs].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);
  container.innerHTML = '';
  if (!gesorteerd.length) {
    container.innerHTML = legeStaat('📋', 'Geen transacties gevonden voor deze periode.');
    return;
  }
  gesorteerd.forEach(tx => container.appendChild(maakTransactieRij(tx)));
}

function legeStaat(icoon, tekst) {
  return `<div class="transactions-empty" role="status" aria-live="polite">
    <span class="empty-icon" aria-hidden="true">${icoon}</span>
    ${tekst}
  </div>`;
}

function maakTransactieRij(tx) {
  const li = document.createElement('div');
  li.className = 'transaction-item';
  li.setAttribute('role', 'listitem');
  li.setAttribute('aria-label', `${tx.type === 'inkomst' ? 'Inkomst' : 'Uitgave'}: ${tx.description}, ${formatEuro(tx.amount)}`);
  const catColor = getCatColor(tx.categoryId);
  const catName  = getCatName(tx.categoryId);
  li.innerHTML = `
    <div class="tx-type-indicator ${tx.type}" aria-hidden="true">${tx.type === 'inkomst' ? '↑' : '↓'}</div>
    <div class="tx-info">
      <div class="tx-description">${beveiligeHtml(tx.description)}</div>
      <div class="tx-meta">
        <span class="tx-date">${formatDatum(tx.date)}</span>
        <span class="tx-category-badge"
              style="background:${catColor}22;color:${catColor};border:1px solid ${catColor}55"
              aria-label="Categorie: ${beveiligeHtml(catName)}">
          ${beveiligeHtml(catName)}
        </span>
      </div>
    </div>
    <span class="tx-amount ${tx.type}" aria-label="Bedrag: ${tx.type === 'inkomst' ? '+' : '-'}${formatEuro(tx.amount)}">
      ${tx.type === 'inkomst' ? '+' : '−'}${formatEuro(tx.amount)}
    </span>
    <div class="tx-actions">
      <button class="btn-icon" onclick="bewerkTransactie('${tx.id}')" aria-label="Transactie bewerken: ${beveiligeHtml(tx.description)}">✏️</button>
      <button class="btn-icon btn-icon-danger" onclick="verwijderTransactie('${tx.id}')" aria-label="Transactie verwijderen: ${beveiligeHtml(tx.description)}">🗑️</button>
    </div>`;
  return li;
}

function beveiligeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// ── Bar Chart ─────────────────────────────────────────────────
function renderBarChart() {
  const canvas = qs('#barChart');
  const emptyMsg = qs('#barChartEmpty');
  const maandData = maandelijksTotalen();
  const sleutels = Object.keys(maandData).sort().slice(-6);

  if (!sleutels.length) {
    canvas.classList.add('hidden');
    emptyMsg.classList.remove('hidden');
    return;
  }
  canvas.classList.remove('hidden');
  emptyMsg.classList.add('hidden');

  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  canvas.width  = container.clientWidth  || 400;
  canvas.height = container.clientHeight || 220;

  const W = canvas.width, H = canvas.height;
  const padL = 60, padR = 20, padT = 20, padB = 50;
  const grafW = W - padL - padR;
  const grafH = H - padT - padB;

  ctx.clearRect(0, 0, W, H);

  const maxWaarde = Math.max(...sleutels.flatMap(k => [maandData[k].inkomsten, maandData[k].uitgaven]), 1);

  // Raster lijnen
  ctx.strokeStyle = 'rgba(148,163,184,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + grafH - (i / 4) * grafH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + grafW, y);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = 'right';
    ctx.fillText(formatEuroKort((i / 4) * maxWaarde), padL - 6, y + 4);
  }

  const groepB = grafW / sleutels.length;
  const staafB = Math.min((groepB - 16) / 2, 28);

  sleutels.forEach((key, idx) => {
    const data = maandData[key];
    const x = padL + idx * groepB + groepB / 2;

    // Inkomsten staaf
    const hI = (data.inkomsten / maxWaarde) * grafH;
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    roundedRect(ctx, x - staafB - 2, padT + grafH - hI, staafB, hI, 3);
    ctx.fill();

    // Uitgaven staaf
    const hU = (data.uitgaven / maxWaarde) * grafH;
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    roundedRect(ctx, x + 2, padT + grafH - hU, staafB, hU, 3);
    ctx.fill();

    // Maand label
    const [y, m] = key.split('-');
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = 'center';
    ctx.fillText(MAANDEN[parseInt(m,10)-1].slice(0,3) + ' ' + y.slice(2), x, H - padB + 16);
  });
}

function roundedRect(ctx, x, y, w, h, r) {
  if (h < 1) h = 1;
  r = Math.min(r, h / 2, w / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function formatEuroKort(val) {
  if (val >= 1000) return '€' + (val/1000).toFixed(1) + 'k';
  return '€' + Math.round(val);
}

// ── Donut Chart ───────────────────────────────────────────────
function renderDonutChart(txs) {
  const canvas = qs('#donutChart');
  const emptyMsg = qs('#donutChartEmpty');
  const legend = qs('#donutChartLegend');

  const uitPerCat = berekenUitgavenPerCategorie(txs);
  const entries = Object.entries(uitPerCat).filter(([,v]) => v > 0);

  if (!entries.length) {
    canvas.classList.add('hidden');
    emptyMsg.classList.remove('hidden');
    legend.innerHTML = '';
    return;
  }
  canvas.classList.remove('hidden');
  emptyMsg.classList.add('hidden');

  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  const size = Math.min(container.clientWidth || 220, container.clientHeight || 220, 200);
  canvas.width = size;
  canvas.height = size;

  const cx = size / 2, cy = size / 2;
  const straal = size * 0.38;
  const gat    = size * 0.22;

  const totaal = entries.reduce((s,[,v]) => s + v, 0);
  let startHoek = -Math.PI / 2;

  ctx.clearRect(0, 0, size, size);

  entries.forEach(([catId, waarde]) => {
    const hoek = (waarde / totaal) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, straal, startHoek, startHoek + hoek);
    ctx.closePath();
    ctx.fillStyle = getCatColor(catId);
    ctx.fill();
    startHoek += hoek;
  });

  // Gat in het midden (donut)
  ctx.beginPath();
  ctx.arc(cx, cy, gat, 0, 2 * Math.PI);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() || '#1e293b';
  ctx.fill();

  // Legenda
  legend.innerHTML = entries.map(([catId, waarde]) => {
    const pct = ((waarde / totaal) * 100).toFixed(1);
    return `<span class="legend-item">
      <span class="legend-dot" style="background:${getCatColor(catId)}" aria-hidden="true"></span>
      ${beveiligeHtml(getCatName(catId))} ${pct}%
    </span>`;
  }).join('');
}

// ── Transacties tab ───────────────────────────────────────────
function renderTransacties() {
  const txGefilterd = gefilterd(state.transactions, state.filterMonthTx, state.filterYearTx, state.filterType);
  const gesorteerd = [...txGefilterd].sort((a,b) => b.date.localeCompare(a.date));
  const container = qs('#allTransactions');
  container.innerHTML = '';
  if (!gesorteerd.length) {
    container.innerHTML = legeStaat('📋', 'Geen transacties gevonden. Voeg een transactie toe om te beginnen.');
    return;
  }
  gesorteerd.forEach(tx => container.appendChild(maakTransactieRij(tx)));
}

// ── Categorieën tab ───────────────────────────────────────────
function renderCategorieen() {
  const container = qs('#categoriesList');
  container.innerHTML = '';

  if (!state.categories.length) {
    container.innerHTML = legeStaat('🏷️', 'Geen categorieën gevonden. Voeg een categorie toe.');
    return;
  }

  const huidigeMaand = String(new Date().getMonth() + 1).padStart(2,'0');
  const huidigJaar   = String(new Date().getFullYear());
  const txDezeM = gefilterd(state.transactions, huidigeMaand, huidigJaar, 'uitgave');
  const uitPerCat = berekenUitgavenPerCategorie(txDezeM);

  state.categories.forEach(cat => {
    const besteed = uitPerCat[cat.id] || 0;
    const budget  = cat.budget && cat.budget > 0 ? cat.budget : null;
    const heeftBudget = budget !== null;
    const pct     = heeftBudget ? clamp(besteed / budget, 0, 1) : 0;
    const overBudget = heeftBudget && besteed > budget;

    const card = document.createElement('div');
    card.className = 'category-card' + (overBudget ? ' over-budget' : '');
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `Categorie: ${cat.name}`);

    let budgetHTML = '';
    if (heeftBudget) {
      const vulKlasse = pct >= 1 ? 'danger' : pct >= 0.8 ? 'warning' : 'normal';
      budgetHTML = `
        <div class="progress-wrapper" aria-label="Budgetvoortgang ${cat.name}">
          <div class="progress-label">
            <span>Budget: ${formatEuro(budget)}</span>
            <span>${(pct*100).toFixed(0)}%</span>
          </div>
          <div class="progress-bar-track" role="progressbar" aria-valuenow="${Math.round(pct*100)}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar-fill ${vulKlasse}" style="width:${(pct*100).toFixed(1)}%"></div>
          </div>
        </div>`;
    }

    card.innerHTML = `
      <div class="category-header">
        <div class="category-name-row">
          <div class="category-color-dot" style="background:${cat.color}" aria-hidden="true"></div>
          <span class="category-name">${beveiligeHtml(cat.name)}</span>
        </div>
        <div class="category-actions">
          <button class="btn-icon" onclick="bewerkCategorie('${cat.id}')" aria-label="Categorie bewerken: ${beveiligeHtml(cat.name)}">✏️</button>
          <button class="btn-icon btn-icon-danger" onclick="verwijderCategorie('${cat.id}')" aria-label="Categorie verwijderen: ${beveiligeHtml(cat.name)}">🗑️</button>
        </div>
      </div>
      <div class="category-stats">
        <span>Besteed (deze maand)</span>
        <span class="category-stat-value">${formatEuro(besteed)}</span>
      </div>
      ${budgetHTML}`;

    container.appendChild(card);
  });
}

// ── Spaardoelen tab ───────────────────────────────────────────
function renderSpaardoelen() {
  const allesTotalen = berekenTotalen(state.transactions);
  const gespaard = allesTotalen.netto;

  qs('#currentSavings').textContent = (gespaard < 0 ? '−\u00a0' : '') + formatEuro(gespaard);
  qs('#currentSavings').style.color = gespaard >= 0 ? 'var(--color-income)' : 'var(--color-expense)';

  const doel = state.savingsGoal;
  if (doel.amount > 0) {
    qs('#goalAmount').textContent = (doel.name ? doel.name + ' – ' : '') + formatEuro(doel.amount);
    const resterend = doel.amount - gespaard;
    qs('#remainingAmount').textContent = resterend > 0
      ? formatEuro(resterend) + ' te gaan'
      : 'Doel behaald! 🎉';
    qs('#remainingAmount').style.color = resterend <= 0 ? 'var(--color-income)' : '';

    const pct = clamp(gespaard / doel.amount, 0, 1);
    const progressWrapper = qs('#savingsGoalProgress');
    progressWrapper.hidden = false;
    progressWrapper.setAttribute('aria-label', `Voortgang spaardoel: ${(pct*100).toFixed(0)}%`);
    qs('#savingsGoalLabel').textContent = doel.name || 'Spaardoel';
    qs('#savingsGoalPct').textContent = (pct*100).toFixed(0) + '%';
    qs('#savingsProgressFill').style.width = (pct*100).toFixed(1) + '%';
    qs('#savingsProgressBar').setAttribute('aria-valuenow', Math.round(pct*100));
  } else {
    qs('#goalAmount').textContent = 'Niet ingesteld';
    qs('#remainingAmount').textContent = '-';
    qs('#savingsGoalProgress').hidden = true;
  }

  // Formulier invullen
  qs('#savingsGoalName').value   = doel.name   || '';
  qs('#savingsGoalAmount').value = doel.amount || '';

  // Maandelijks overzicht
  renderMaandelijksSparen();
}

function renderMaandelijksSparen() {
  const container = qs('#monthlySavingsList');
  const maandKaart = maandelijksTotalen();
  const sleutels = Object.keys(maandKaart).sort().reverse();
  container.innerHTML = '';

  if (!sleutels.length) {
    container.innerHTML = legeStaat('📅', 'Geen maandgegevens beschikbaar.');
    return;
  }

  sleutels.forEach(key => {
    const d = maandKaart[key];
    const netto = d.inkomsten - d.uitgaven;
    const [y, m] = key.split('-');
    const item = document.createElement('div');
    item.className = 'monthly-savings-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-label', `${MAANDEN[parseInt(m,10)-1]} ${y}: ${formatEuro(netto)}`);
    item.innerHTML = `
      <span class="monthly-savings-month">${MAANDEN[parseInt(m,10)-1]} ${y}</span>
      <span class="monthly-savings-amount ${netto >= 0 ? 'positive' : 'negative'}">
        ${netto < 0 ? '−' : '+'}${formatEuro(netto)}
      </span>`;
    container.appendChild(item);
  });
}

// ── Transactie modaal ─────────────────────────────────────────
function openTransactieModaal(tx = null) {
  const modal = qs('#transactionModal');
  const titleEl = qs('#transactionModalTitle');
  titleEl.textContent = tx ? 'Transactie bewerken' : 'Transactie toevoegen';
  qs('#transactionId').value      = tx ? tx.id : '';
  qs('#txType').value             = tx ? tx.type : 'uitgave';
  qs('#txDate').value             = tx ? tx.date : vandaagStr();
  qs('#txDescription').value      = tx ? tx.description : '';
  qs('#txAmount').value           = tx ? tx.amount : '';
  qs('#txFormError').hidden       = true;

  // Categorieën invullen
  const catSel = qs('#txCategory');
  catSel.innerHTML = state.categories.map(c =>
    `<option value="${c.id}">${beveiligeHtml(c.name)}</option>`
  ).join('');
  catSel.value = tx ? tx.categoryId : (state.categories[0]?.id || '');

  modal.hidden = false;
  qs('#txDescription').focus();
}

function sluitTransactieModaal() {
  qs('#transactionModal').hidden = true;
  qs('#transactionForm').reset();
}

function bewerkTransactie(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (tx) openTransactieModaal(tx);
}

function verwijderTransactie(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  bevestig(
    `Weet je zeker dat je de transactie "${tx.description}" wilt verwijderen?`,
    () => {
      state.transactions = state.transactions.filter(t => t.id !== id);
      slaOp();
      vulFilterOpties();
      renderHuidigTab();
      toonToast('Transactie verwijderd.', 'success');
    }
  );
}

// ── Categorie modaal ──────────────────────────────────────────
function openCategorieModaal(cat = null) {
  const modal = qs('#categoryModal');
  qs('#categoryModalTitle').textContent = cat ? 'Categorie bewerken' : 'Categorie toevoegen';
  qs('#categoryId').value    = cat ? cat.id : '';
  qs('#catName').value       = cat ? cat.name : '';
  qs('#catColor').value      = cat ? cat.color : '#6366f1';
  qs('#catBudget').value     = cat && cat.budget ? cat.budget : '';
  qs('#catFormError').hidden = true;
  modal.hidden = false;
  qs('#catName').focus();
}

function sluitCategorieModaal() {
  qs('#categoryModal').hidden = true;
  qs('#categoryForm').reset();
}

function bewerkCategorie(id) {
  const cat = getCatById(id);
  if (cat) openCategorieModaal(cat);
}

function verwijderCategorie(id) {
  const cat = getCatById(id);
  if (!cat) return;
  const aantalTx = state.transactions.filter(t => t.categoryId === id).length;
  const extra = aantalTx > 0 ? ` Er zijn ${aantalTx} transactie(s) in deze categorie. Deze worden verplaatst naar 'Overig'.` : '';
  bevestig(
    `Weet je zeker dat je de categorie "${cat.name}" wilt verwijderen?${extra}`,
    () => {
      // Verplaats transacties naar 'Overig'
      const overigId = state.categories.find(c => c.name === 'Overig' && c.id !== id)?.id || null;
      state.transactions = state.transactions.map(tx =>
        tx.categoryId === id ? { ...tx, categoryId: overigId || tx.categoryId } : tx
      );
      state.categories = state.categories.filter(c => c.id !== id);
      slaOp();
      renderHuidigTab();
      toonToast('Categorie verwijderd.', 'success');
    }
  );
}

// ── Bevestiging modaal ────────────────────────────────────────
let bevestigCallback = null;
function bevestig(bericht, cb) {
  qs('#confirmMessage').textContent = bericht;
  qs('#confirmModal').hidden = false;
  bevestigCallback = cb;
}

// ── CSV Export ────────────────────────────────────────────────
function exporteerCSV() {
  const kolommen = ['id','datum','type','omschrijving','bedrag','categorie'];
  const rijen = state.transactions.map(tx => [
    tx.id,
    tx.date,
    tx.type,
    `"${tx.description.replace(/"/g,'""')}"`,
    tx.amount.toFixed(2),
    `"${getCatName(tx.categoryId).replace(/"/g,'""')}"`,
  ]);
  const csv = [kolommen.join(','), ...rijen.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transacties_${vandaagStr()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toonToast('CSV geëxporteerd.', 'success');
}

// ── CSV Import ────────────────────────────────────────────────
function importeerCSV(bestand) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const tekst = e.target.result.replace(/^\uFEFF/, ''); // BOM verwijderen
      const regels = tekst.split(/\r?\n/).filter(r => r.trim());
      if (regels.length < 2) throw new Error('Geen gegevens gevonden in het CSV-bestand.');

      const kolomNamen = regels[0].split(',').map(k => k.trim().toLowerCase());
      const idxDatum   = kolomNamen.indexOf('datum');
      const idxType    = kolomNamen.indexOf('type');
      const idxOmschr  = kolomNamen.indexOf('omschrijving');
      const idxBedrag  = kolomNamen.indexOf('bedrag');
      const idxCat     = kolomNamen.indexOf('categorie');

      if ([idxDatum, idxType, idxOmschr, idxBedrag, idxCat].some(i => i < 0)) {
        throw new Error('Ongeldige CSV-structuur. Verwachte kolommen: datum, type, omschrijving, bedrag, categorie.');
      }

      let toegevoegd = 0;
      regels.slice(1).forEach(regel => {
        const delen = parseCSVRegel(regel);
        const type = delen[idxType]?.trim().toLowerCase();
        if (type !== 'inkomst' && type !== 'uitgave') return;

        const bedrag = parseFloat(delen[idxBedrag]?.replace(',','.'));
        if (isNaN(bedrag) || bedrag <= 0) return;

        const datum = delen[idxDatum]?.trim();
        if (!datum) return;

        const catNaam = delen[idxCat]?.trim() || 'Overig';
        let catId = state.categories.find(c => c.name.toLowerCase() === catNaam.toLowerCase())?.id;
        if (!catId) {
          catId = uid();
          state.categories.push({ id: catId, name: catNaam, color: '#94a3b8', budget: null });
        }

        state.transactions.push({
          id: uid(),
          type,
          date: datum,
          description: delen[idxOmschr]?.trim() || 'Geïmporteerd',
          amount: bedrag,
          categoryId: catId,
        });
        toegevoegd++;
      });

      slaOp();
      vulFilterOpties();
      renderHuidigTab();
      toonToast(`${toegevoegd} transactie(s) geïmporteerd.`, 'success');
    } catch(err) {
      toonToast('Importfout: ' + err.message, 'error');
    }
  };
  reader.readAsText(bestand, 'utf-8');
}

function parseCSVRegel(regel) {
  const res = [];
  let huidig = '';
  let inQuotes = false;
  for (let i = 0; i < regel.length; i++) {
    const c = regel[i];
    if (c === '"') {
      if (inQuotes && regel[i+1] === '"') { huidig += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      res.push(huidig); huidig = '';
    } else {
      huidig += c;
    }
  }
  res.push(huidig);
  return res;
}

// ── Reset ─────────────────────────────────────────────────────
function resetAlles() {
  bevestig(
    'Weet je zeker dat je alle gegevens wilt wissen? Dit kan niet ongedaan worden gemaakt.',
    () => {
      localStorage.removeItem(STORAGE_KEY);
      state.transactions = [];
      state.categories   = STANDAARD_CATEGORIEEN.map(c => ({...c}));
      state.savingsGoal  = { name: '', amount: 0 };
      state.filterMonth = state.filterYear = state.filterMonthTx = state.filterYearTx = state.filterType = '';
      slaOp();
      vulFilterOpties();
      renderHuidigTab();
      toonToast('Alle gegevens zijn gewist.', 'info');
    }
  );
}

// ── Event Listeners ───────────────────────────────────────────
function initEvents() {
  // Navigatie
  qsa('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => activeerTab(btn.dataset.tab));
  });

  // Dashboard filter
  qs('#filterMonth').addEventListener('change', e => { state.filterMonth = e.target.value; renderDashboard(); });
  qs('#filterYear').addEventListener('change',  e => { state.filterYear  = e.target.value; renderDashboard(); });
  qs('#btnClearFilter').addEventListener('click', () => {
    state.filterMonth = state.filterYear = '';
    qs('#filterMonth').value = '';
    qs('#filterYear').value  = '';
    renderDashboard();
  });

  // Transacties filter
  qs('#filterMonthTx').addEventListener('change', e => { state.filterMonthTx = e.target.value; renderTransacties(); });
  qs('#filterYearTx').addEventListener('change',  e => { state.filterYearTx  = e.target.value; renderTransacties(); });
  qs('#filterType').addEventListener('change',    e => { state.filterType    = e.target.value; renderTransacties(); });
  qs('#btnClearFilterTx').addEventListener('click', () => {
    state.filterMonthTx = state.filterYearTx = state.filterType = '';
    qs('#filterMonthTx').value = '';
    qs('#filterYearTx').value  = '';
    qs('#filterType').value    = '';
    renderTransacties();
  });

  // Transactie toevoegen knoppen
  qs('#btnAddTransaction').addEventListener('click', () => openTransactieModaal());
  qs('#btnAddTransactionDash').addEventListener('click', () => openTransactieModaal());

  // Transactie modaal sluiten
  qs('#closeTransactionModal').addEventListener('click', sluitTransactieModaal);
  qs('#cancelTransaction').addEventListener('click', sluitTransactieModaal);
  qs('#transactionModalOverlay').addEventListener('click', sluitTransactieModaal);

  // Transactie formulier opslaan
  qs('#transactionForm').addEventListener('submit', e => {
    e.preventDefault();
    const id        = qs('#transactionId').value;
    const type      = qs('#txType').value;
    const date      = qs('#txDate').value;
    const descr     = qs('#txDescription').value.trim();
    const amount    = parseFloat(qs('#txAmount').value);
    const catId     = qs('#txCategory').value;
    const errorEl   = qs('#txFormError');

    if (!descr) {
      errorEl.textContent = 'Vul een omschrijving in.';
      errorEl.hidden = false; return;
    }
    if (isNaN(amount) || amount <= 0) {
      errorEl.textContent = 'Vul een geldig bedrag in (groter dan 0).';
      errorEl.hidden = false; return;
    }
    if (!date) {
      errorEl.textContent = 'Selecteer een datum.';
      errorEl.hidden = false; return;
    }
    errorEl.hidden = true;

    if (id) {
      // Bewerken
      const idx = state.transactions.findIndex(t => t.id === id);
      if (idx !== -1) state.transactions[idx] = { ...state.transactions[idx], type, date, description: descr, amount, categoryId: catId };
      toonToast('Transactie bijgewerkt.', 'success');
    } else {
      // Toevoegen
      state.transactions.push({ id: uid(), type, date, description: descr, amount, categoryId: catId });
      toonToast('Transactie toegevoegd.', 'success');
    }
    slaOp();
    vulFilterOpties();
    sluitTransactieModaal();
    renderHuidigTab();
  });

  // Categorie toevoegen knop
  qs('#btnAddCategory').addEventListener('click', () => openCategorieModaal());

  // Categorie modaal sluiten
  qs('#closeCategoryModal').addEventListener('click', sluitCategorieModaal);
  qs('#cancelCategory').addEventListener('click', sluitCategorieModaal);
  qs('#categoryModalOverlay').addEventListener('click', sluitCategorieModaal);

  // Categorie formulier opslaan
  qs('#categoryForm').addEventListener('submit', e => {
    e.preventDefault();
    const id     = qs('#categoryId').value;
    const name   = qs('#catName').value.trim();
    const color  = qs('#catColor').value;
    const budget = parseFloat(qs('#catBudget').value) || null;
    const errorEl = qs('#catFormError');

    if (!name) {
      errorEl.textContent = 'Vul een naam in voor de categorie.';
      errorEl.hidden = false; return;
    }
    const dubbelNaam = state.categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== id);
    if (dubbelNaam) {
      errorEl.textContent = 'Er bestaat al een categorie met deze naam.';
      errorEl.hidden = false; return;
    }
    errorEl.hidden = true;

    if (id) {
      const idx = state.categories.findIndex(c => c.id === id);
      if (idx !== -1) state.categories[idx] = { ...state.categories[idx], name, color, budget };
      toonToast('Categorie bijgewerkt.', 'success');
    } else {
      state.categories.push({ id: uid(), name, color, budget });
      toonToast('Categorie toegevoegd.', 'success');
    }
    slaOp();
    sluitCategorieModaal();
    renderHuidigTab();
  });

  // Bevestiging modaal
  qs('#confirmCancel').addEventListener('click', () => { qs('#confirmModal').hidden = true; bevestigCallback = null; });
  qs('#confirmOk').addEventListener('click', () => {
    qs('#confirmModal').hidden = true;
    if (bevestigCallback) { bevestigCallback(); bevestigCallback = null; }
  });
  qs('#confirmModalOverlay').addEventListener('click', () => { qs('#confirmModal').hidden = true; bevestigCallback = null; });

  // Spaardoel formulier
  qs('#savingsGoalForm').addEventListener('submit', e => {
    e.preventDefault();
    const name   = qs('#savingsGoalName').value.trim();
    const amount = parseFloat(qs('#savingsGoalAmount').value) || 0;
    state.savingsGoal = { name, amount };
    slaOp();
    renderSpaardoelen();
    toonToast('Spaardoel opgeslagen.', 'success');
  });

  // CSV Export
  qs('#btnExportCSV').addEventListener('click', exporteerCSV);

  // CSV Import
  qs('#importCSVInput').addEventListener('change', e => {
    const bestand = e.target.files[0];
    if (bestand) { importeerCSV(bestand); e.target.value = ''; }
  });

  // Reset
  qs('#btnReset').addEventListener('click', resetAlles);

  // Toetsenbord: Escape sluit modalen
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!qs('#transactionModal').hidden) sluitTransactieModaal();
      if (!qs('#categoryModal').hidden)    sluitCategorieModaal();
      if (!qs('#confirmModal').hidden) {
        qs('#confirmModal').hidden = true;
        bevestigCallback = null;
      }
    }
  });

  // Venster resize → grafieken hertekenen
  window.addEventListener('resize', debounce(() => {
    if (state.activeTab === 'dashboard') {
      renderBarChart();
      const txGefilterd = gefilterd(state.transactions, state.filterMonth, state.filterYear, '');
      renderDonutChart(txGefilterd);
    }
  }, 200));
}

function debounce(fn, vertraging) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), vertraging);
  };
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  laadData();
  vulFilterOpties();
  initEvents();
  activeerTab('dashboard');
});
