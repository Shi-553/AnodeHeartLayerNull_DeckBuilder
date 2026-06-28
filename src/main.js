// メタ情報(属性/種族/色/種族説明)は data/meta.json から init() で読み込む。
let ATTRS         = [];
let TRIBES        = [];
let TRIBES_JA     = {};
let ELEMENT_JA    = {};
let ELEMENT_ORDER = [];
let ELEMENT_COLOR = {};
let SPECIES_DESC  = {};
let SPECIES_NAME  = {};
// 全カードのエントリ配列(検索対象)。data/cards.json から init() で読み込む。
let ALL_CARDS = [];

const DARK_MAP = {
  'Neutral': 'Null',
  'Native':  'DarkNative',
  'Fire':    'DarkFire',
  'Earth':   'DarkEarth',
  'Water':   'DarkWater',
  'Wind':    'DarkWind',
  'Elec':    'DarkElec',
  'Machine': 'DarkMachine',
  'Ice':     'DarkIce',
};

const ATTR_COLORS = {
  'Neutral':     'bg-gray-200 text-gray-700',
  'Native':      'bg-green-100 text-green-800',
  'Fire':        'bg-red-100 text-red-700',
  'DarkFire':    'bg-red-900 text-red-200',
  'Earth':       'bg-yellow-100 text-yellow-800',
  'DarkEarth':   'bg-yellow-900 text-yellow-200',
  'Water':       'bg-blue-100 text-blue-700',
  'DarkWater':   'bg-blue-900 text-blue-200',
  'Wind':        'bg-sky-100 text-sky-700',
  'DarkWind':    'bg-sky-900 text-sky-200',
  'Elec':        'bg-yellow-200 text-yellow-900',
  'DarkElec':    'bg-yellow-900 text-yellow-200',
  'Machine':     'bg-slate-200 text-slate-700',
  'DarkMachine': 'bg-slate-900 text-slate-200',
  'Virtual':     'bg-purple-100 text-purple-700',
  'Gold':        'bg-amber-100 text-amber-800',
  'Ice':         'bg-cyan-100 text-cyan-700',
  'DarkIce':     'bg-cyan-900 text-cyan-200',
  'DarkNative':  'bg-green-900 text-green-200',
  'Null':        'bg-gray-700 text-gray-200',
};

let currentType = 'tama';
let currentLv = '';
let selectedAttrs  = new Set();
let selectedTribes = new Set();
let debTimer = null;
let sortKey = null;
let sortDir = 1;
let lastRows = [];
let lastQ = '';

function debounce(fn, ms = 250) {
  clearTimeout(debTimer);
  debTimer = setTimeout(fn, ms);
}

let kwHistory = [];
try { kwHistory = JSON.parse(localStorage.getItem('kw-history') || '[]'); } catch (e) { kwHistory = []; }

function onKwInput() {
  updateKwClearBtn();
  debounce(doSearch);
}

function updateKwClearBtn() {
  document.getElementById('kw-clear').classList.toggle('hidden', !document.getElementById('q').value);
}

function clearKw() {
  const input = document.getElementById('q');
  input.value = '';
  updateKwClearBtn();
  input.focus();
  doSearch();
}

function commitKwHistory() {
  const v = document.getElementById('q').value.trim();
  if (!v) return;
  kwHistory = kwHistory.filter(h => h !== v);
  kwHistory.unshift(v);
  kwHistory = kwHistory.slice(0, 10);
  localStorage.setItem('kw-history', JSON.stringify(kwHistory));
}

function onKwKeydown(e) {
  if (e.key === 'Enter') hideKwHistory();
}

function renderKwHistoryList() {
  const list = document.getElementById('kw-history-list');
  list.innerHTML = '';
  kwHistory.forEach(h => {
    const row = document.createElement('div');
    row.className = 'px-2.5 py-1.5 text-xs text-gray-200 hover:bg-gray-600 cursor-pointer flex items-center justify-between gap-2';
    row.addEventListener('click', () => applyKwHistory(h));
    const label = document.createElement('span');
    label.className = 'truncate';
    label.textContent = h;
    const del = document.createElement('span');
    del.className = 'text-gray-500 hover:text-red-400 shrink-0 px-1';
    del.textContent = '×';
    del.addEventListener('click', ev => { ev.stopPropagation(); removeKwHistory(h); });
    row.appendChild(label);
    row.appendChild(del);
    list.appendChild(row);
  });
}

function toggleKwHistory(e) {
  e.stopPropagation();
  const list = document.getElementById('kw-history-list');
  if (!list.classList.contains('hidden')) { hideKwHistory(); return; }
  if (kwHistory.length === 0) return;
  renderKwHistoryList();
  list.classList.remove('hidden');
}

function hideKwHistory() {
  document.getElementById('kw-history-list').classList.add('hidden');
}

function applyKwHistory(v) {
  const input = document.getElementById('q');
  input.value = v;
  updateKwClearBtn();
  hideKwHistory();
  commitKwHistory();
  doSearch();
}

function removeKwHistory(h) {
  kwHistory = kwHistory.filter(x => x !== h);
  localStorage.setItem('kw-history', JSON.stringify(kwHistory));
  if (kwHistory.length === 0) { hideKwHistory(); return; }
  renderKwHistoryList();
}

document.addEventListener('click', e => {
  const list = document.getElementById('kw-history-list');
  const btn  = document.getElementById('kw-history-btn');
  if (!list.classList.contains('hidden') && !list.contains(e.target) && e.target !== btn) hideKwHistory();
});

const TYPES = ['all', 'tama', 'appli', 'virus', 'patch'];

function setType(t, silent) {
  currentType = t;
  if (t !== 'tama') { currentLv = ''; }
  const active   = 'py-1 rounded text-xs font-bold transition bg-indigo-600 text-white';
  const inactive = 'py-1 rounded text-xs font-bold transition bg-gray-600 text-gray-300';
  TYPES.forEach(k => {
    document.getElementById('btn-' + k).className = k === t ? active : inactive;
  });
  document.getElementById('lv-section').style.display = t === 'tama' ? '' : 'none';
  if (!silent) doSearch();
}

function setLv(v, silent) {
  currentLv = v;
  const keys = ['all', '0', '1', '2', '3', '4'];
  const active   = 'flex-1 py-1 rounded text-xs font-semibold bg-indigo-600 text-white transition';
  const inactive = 'flex-1 py-1 rounded text-xs font-semibold bg-gray-600 text-gray-300 transition';
  keys.forEach(k => {
    document.getElementById('lv-' + k).className = (k === 'all' ? '' : k) === v ? active : inactive;
  });
  if (!silent) doSearch();
}

function makeAttrCell(a) {
  const color = ATTR_COLORS[a] || 'bg-gray-600 text-gray-200';
  const ja = ELEMENT_JA[a] || a;
  const el = document.createElement('div');
  el.id = 'attr-row-' + a;
  el.className = 'flex-1 min-w-0 flex items-center gap-2 px-2 py-1 rounded cursor-pointer select-none hover:bg-gray-600';
  el.innerHTML = '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + color + ' truncate">' + ja + '</span>';
  el.addEventListener('click', e => onAttrClick(a, e));
  return el;
}

function buildAttrList() {
  const wrap = document.getElementById('attr-list');
  const attrSet = new Set(ATTRS);
  const pairedDark = new Set();
  Object.entries(DARK_MAP).forEach(([light, dark]) => {
    if (attrSet.has(light) && attrSet.has(dark)) pairedDark.add(dark);
  });
  ATTRS.forEach(a => {
    if (pairedDark.has(a)) return; // 対応する闇属性の行で一緒に描画される
    const row = document.createElement('div');
    row.className = 'flex gap-1.5';
    row.appendChild(makeAttrCell(a));
    const dark = DARK_MAP[a];
    if (dark && attrSet.has(dark)) row.appendChild(makeAttrCell(dark));
    wrap.appendChild(row);
  });
}

function buildTribeList() {
  const wrap = document.getElementById('tribe-list');
  TRIBES.forEach(t => {
    const el = document.createElement('div');
    el.id = 'tribe-row-' + t;
    el.className = 'shrink-0 whitespace-nowrap px-2 py-1 rounded-full text-xs text-gray-200 bg-gray-600 cursor-pointer select-none hover:bg-gray-500';
    el.textContent = TRIBES_JA[t] || t;
    el.addEventListener('click', e => onTribeClick(t, e));
    wrap.appendChild(el);
  });
}

function onAttrClick(a, e) {
  if (!e.ctrlKey && !e.metaKey) {
    if (selectedAttrs.size === 1 && selectedAttrs.has(a)) {
      selectedAttrs.clear();
    } else {
      selectedAttrs.clear();
      selectedAttrs.add(a);
    }
  } else {
    if (selectedAttrs.has(a)) selectedAttrs.delete(a);
    else selectedAttrs.add(a);
  }
  updateAttrHighlight();
  doSearch();
}

function effectiveAttrs() {
  const set = new Set(selectedAttrs);
  if (document.getElementById('include-dark').checked) {
    selectedAttrs.forEach(a => { const d = DARK_MAP[a]; if (d) set.add(d); });
  }
  return set;
}

function updateAttrHighlight() {
  const highlightSet = effectiveAttrs();
  ATTRS.forEach(a => {
    const el = document.getElementById('attr-row-' + a);
    if (!el) return;
    el.style.backgroundColor = highlightSet.has(a) ? '#312e81' : '';
  });
}

function onTribeClick(t, e) {
  if (!e.ctrlKey && !e.metaKey) {
    if (selectedTribes.size === 1 && selectedTribes.has(t)) {
      selectedTribes.clear();
    } else {
      selectedTribes.clear();
      selectedTribes.add(t);
    }
  } else {
    if (selectedTribes.has(t)) selectedTribes.delete(t);
    else selectedTribes.add(t);
  }
  updateTribeHighlight();
  doSearch();
}

function updateTribeHighlight() {
  TRIBES.forEach(t => {
    const el = document.getElementById('tribe-row-' + t);
    if (!el) return;
    el.style.backgroundColor = selectedTribes.has(t) ? '#312e81' : '';
  });
}

function attrBadge(a) {
  const color = ATTR_COLORS[a] || 'bg-gray-100 text-gray-700';
  const ja = ELEMENT_JA[a] || a;
  const cls = 'px-2 py-0.5 rounded-full text-xs font-medium ' + color + ' whitespace-nowrap' + (a ? ' cursor-pointer hover:opacity-80' : '');
  const data = a ? ' data-attr="' + esc(a) + '"' : '';
  return '<span class="' + cls + '"' + data + '>' + ja + '</span>';
}

const TYPE_COLORS = {
  tama:  'bg-indigo-200 text-indigo-800',
  appli: 'bg-green-200 text-green-800',
  virus: 'bg-red-200 text-red-800',
  patch: 'bg-yellow-200 text-yellow-800',
};
const TYPE_LABELS = { tama: 'タマ', appli: 'アプリ', virus: 'ウイルス', patch: 'パッチ' };
function typeBadge(t) {
  const color = TYPE_COLORS[t] || 'bg-gray-200 text-gray-700';
  return '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + color + ' whitespace-nowrap">' + (TYPE_LABELS[t] || t) + '</span>';
}

// 種族の文字色(scripts/effects_ja.py の _YELLOW と同じ色。効果テキスト内の属性/種族表記と揃える)
const TRIBE_TEXT_COLOR = '#f5bf42';

const ALL_CARD_TYPES = ['tama', 'appli', 'patch', 'virus'];

function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, ''); }

// SEARCH_FIELDS(scripts/site_data.py)と同じ検索対象テキストを返す。
const SEARCH_FIELD_FN = {
  name:   e => e.name || '',
  id:     e => e.name_en || '',
  cost:   e => stripHtml(e.cost_ja),
  effect: e => stripHtml(e.effect_ja) + stripHtml(e.flags_ja),
  json:   e => e.raw_json || '',
};

// scripts/site_data.py の search_cards() と同一のフィルタ条件をクライアントで実行する。
function doSearch() {
  const q = document.getElementById('q').value.trim();
  const showDex   = document.getElementById('show-dex').checked;
  const showSpawn = document.getElementById('show-spawn').checked;
  const showNpc   = document.getElementById('show-npc').checked;
  const targetIds = ['name', 'id', 'cost', 'effect', 'json'];
  const targets = targetIds.filter(t => document.getElementById('target-' + t).checked);
  const attrSet = effectiveAttrs();
  const qLower = q.toLowerCase();

  const results = ALL_CARDS.filter(e => {
    if (currentType === 'all') {
      if (!ALL_CARD_TYPES.includes(e.card_type)) return false;
    } else if (e.card_type !== currentType) {
      return false;
    }
    if (attrSet.size && !attrSet.has(e.attr)) return false;
    const isNpc = !e.in_dex && !e.is_spawnable;
    if (!showDex && e.in_dex) return false;
    if (!showSpawn && e.is_spawnable) return false;
    if (!showNpc && isNpc) return false;
    if (currentLv && String(e.lv) !== currentLv) return false;
    if (selectedTribes.size && !selectedTribes.has(e.class)) return false;
    if (q && !targets.some(t => SEARCH_FIELD_FN[t] && SEARCH_FIELD_FN[t](e).toLowerCase().includes(qLower))) return false;
    return true;
  });

  lastQ = q;
  document.getElementById('count-badge').textContent = results.length + ' 件';
  renderTable(results);
  updateFilterResetButtons();
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function highlight(s, q) {
  const escaped = esc(s);
  if (!q) return escaped;
  const escapedQ = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(escapedQ, 'gi'), m => '<mark>' + m + '</mark>');
}

// HTMLタグをスキップしてテキスト部分のみにハイライトを適用する
function highlightHtml(html, q) {
  if (!q || !html) return html;
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(
    new RegExp('(<[^>]*>)|(' + escapedQ + ')', 'gi'),
    (match, tag) => tag ? tag : '<mark>' + match + '</mark>'
  );
}

function fmtCost(r) {
  const ja = r.cost_ja || '';
  if (!ja) return '<span class="text-gray-500">-</span>';
  return ja;
}

function fmtBonus(r) {
  if (r.bonus_hp == null && r.bonus_bp == null) return '<span class="text-gray-500">-</span>';
  function sign(v) { return (v >= 0 ? '+' : '') + v; }
  return '<span class="font-mono text-gray-300">' + sign(r.bonus_hp) + '</span>' +
         '<span class="text-gray-500">/</span>' +
         '<span class="font-mono text-gray-300">' + sign(r.bonus_bp) + '</span>';
}

function fmtFlags(r) {
  return r.flags_ja || '';
}

function fmtEffect(r) {
  return r.effect_ja || '';
}

function toggleDetail(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}

const SORT_KEYS = {
  'タイプ': 'card_type', 'コスト': 'cost',
  'Lv': 'lv', 'HP': 'hp', 'BP': 'bp',
};

function sortRows(rows) {
  if (!sortKey) return rows;
  return [...rows].sort((a, b) => {
    const av = a[sortKey] != null ? a[sortKey] : '';
    const bv = b[sortKey] != null ? b[sortKey] : '';
    if (['cost','lv','hp','bp','bonus_hp','bonus_bp'].includes(sortKey)) {
      return (Number(av) - Number(bv)) * sortDir;
    }
    return String(av).localeCompare(String(bv), 'ja') * sortDir;
  });
}

function onHeaderClick(key) {
  if (sortKey === key) sortDir *= -1;
  else { sortKey = key; sortDir = 1; }
  renderTable(lastRows);
}

// 1枚のカード行(本体行 + JSON詳細行)のHTMLを返す。
// 通常の検索結果一覧と、カード名クリックで展開する参照先カード行の両方で共用する。
function buildRowHtml(r, opts) {
  const isTama = currentType === 'tama';
  const isAll  = currentType === 'all';
  const colCount = isTama ? 9 : isAll ? 10 : 5;
  const depth = opts.depth || 0;
  const detailId = opts.detailId;
  const eff = fmtEffect(r);
  const lvCell = r.lv !== '' && r.lv != null
    ? '<span class="font-bold text-indigo-400">' + esc(r.lv === 0 ? '?' : r.lv) + '</span>'
    : '<span class="text-gray-600">-</span>';
  let cols = '';

  const tdBase = 'px-3 py-2 border-b border-gray-700';
  // depth > 0 (参照先として展開された行) は、画像セルに左アクセントと
  // 段数に応じたインデントを付けて、上のカードとのつながりを示す。
  const connectStyle = depth > 0
    ? ';border-left:3px solid #6366f1;padding-left:' + (10 + (depth - 1) * 14) + 'px'
    : '';
  const thumbBorder = ELEMENT_COLOR[r.attr] || '#4b5563';
  const imgCell = '<td class="' + tdBase + ' text-center" style="width:84px' + connectStyle + '" title="クリックでデッキに追加"><img src="' + esc(r.img_url) + '" alt="" class="card-thumb" style="border-color:' + esc(thumbBorder) + '" loading="lazy" onerror="this.style.display=\'none\'"></td>';
  const fusionTip    = r.fusion_html ? ' class="fusion-badge kw" data-tip="' + esc(r.fusion_html) + '"' : ' class="fusion-badge"';
  const fusionBadge  = r.from_fusion  ? ' <span' + fusionTip + '>合体</span>' : '';
  const glyphBadge   = (!r.in_dex && r.is_glyph) ? ' <span class="fusion-badge" style="background:#7c3aed">グリフ</span>' : '';
  const spawnTip     = r.spawn_html ? ' class="fusion-badge kw" data-tip="' + esc(r.spawn_html) + '" style="background:#0e7490"' : ' class="fusion-badge" style="background:#0e7490"';
  const spawnBadge   = ((!r.in_dex && r.is_spawnable && !r.is_glyph) || (r.in_dex && r.has_spawn_sources)) ? ' <span' + spawnTip + '>生成</span>' : '';
  const noDeckBadge  = (!r.in_dex && (r.is_spawnable || r.from_fusion || r.is_glyph)) ? ' <span class="fusion-badge" style="background:#b45309">デッキ外</span>' : '';
  const npcBadge     = (!r.in_dex && !r.is_spawnable && !r.from_fusion && !r.is_glyph) ? ' <span class="fusion-badge" style="background:#6b7280">NPC</span>' : '';
  const nameBadges   = fusionBadge + glyphBadge + spawnBadge + noDeckBadge + npcBadge;
  const tribeData = r.class ? ' data-tribe="' + esc(r.class) + '"' : '';
  const tribeCls = 'text-gray-400 text-xs mt-1' + (r.class ? ' cursor-pointer hover:underline block w-fit mx-auto' : '');
  const attrClassCell =
    '<td class="' + tdBase + ' whitespace-nowrap text-center">' +
    attrBadge(r.attr) +
    '<div class="' + tribeCls + '"' + tribeData + '>' + (esc(r.class_ja || r.class) || '') + '</div>' +
    '</td>';
  const connectMark = depth > 0 ? '<span class="text-indigo-400 mr-1" title="参照元カードから展開">↳</span>' : '';
  const nameIdCell =
    '<td class="' + tdBase + ' whitespace-nowrap">' +
    '<div class="font-semibold text-gray-100">' + connectMark + '<span class="card-name">' + highlight(r.name, lastQ) + '</span>' + nameBadges + '</div>' +
    '<div class="text-gray-500 text-xs cursor-pointer hover:underline inline-block" data-detail-toggle="' + detailId + '" title="クリックでJSON表示">' + highlight(r.name_en, lastQ) + '</div>' +
    '</td>';
  const flagsHtml = fmtFlags(r);
  const flagsEffCell =
    '<td class="' + tdBase + ' effect-cell text-gray-300">' +
    (flagsHtml && eff
      ? '<div class="effect-text">' + highlightHtml(eff, lastQ) + '</div><div class="effect-text" style="margin-top:4px;border-top:1px solid #374151;padding-top:4px">' + highlightHtml(flagsHtml, lastQ) + '</div>'
      : '<div class="effect-text">' + highlightHtml(flagsHtml || eff, lastQ) + '</div>') +
    '</td>';
  if (isTama) {
    cols =
      imgCell +
      attrClassCell +
      '<td class="' + tdBase + ' text-center">' + lvCell + '</td>' +
      nameIdCell +
      '<td class="' + tdBase + ' whitespace-nowrap">' + highlightHtml(fmtCost(r), lastQ) + '</td>' +
      '<td class="' + tdBase + ' text-center font-mono text-gray-200">' + (r.hp !== '' ? esc(r.hp) : '-') + '</td>' +
      '<td class="' + tdBase + ' text-center font-mono text-gray-200">' + (r.bp !== '' ? esc(r.bp) : '-') + '</td>' +
      '<td class="' + tdBase + ' text-center">' + fmtBonus(r) + '</td>' +
      flagsEffCell;
  } else if (isAll) {
    cols =
      imgCell +
      attrClassCell +
      '<td class="' + tdBase + '">' + typeBadge(r.card_type) + '</td>' +
      '<td class="' + tdBase + ' text-center">' + lvCell + '</td>' +
      nameIdCell +
      '<td class="' + tdBase + ' whitespace-nowrap">' + highlightHtml(fmtCost(r), lastQ) + '</td>' +
      '<td class="' + tdBase + ' text-center font-mono text-gray-200">' + (r.hp !== '' ? esc(r.hp) : '-') + '</td>' +
      '<td class="' + tdBase + ' text-center font-mono text-gray-200">' + (r.bp !== '' ? esc(r.bp) : '-') + '</td>' +
      '<td class="' + tdBase + ' text-center">' + fmtBonus(r) + '</td>' +
      flagsEffCell;
  } else {
    cols =
      imgCell +
      attrClassCell +
      nameIdCell +
      '<td class="' + tdBase + ' whitespace-nowrap">' + highlightHtml(fmtCost(r), lastQ) + '</td>' +
      flagsEffCell;
  }
  const rawJson = r.raw_json || '(データなし)';
  const rowBg = depth > 0 ? '' : (opts.zebra || 'bg-gray-900');
  const rowStyle = depth > 0 ? ' style="background:rgba(99,102,241,0.07)"' : '';
  return (
    '<tr class="' + rowBg + '" data-depth="' + depth + '" data-card-id="' + esc(r.name_en) + '" data-addable="' + (r.in_dex ? '1' : '0') + '"' + rowStyle + '>' + cols + '</tr>' +
    '<tr id="' + detailId + '" class="json-detail bg-gray-950" style="display:none"><td colspan="' + colCount + '" class="px-4 py-2 border-b border-gray-700"><pre>' + highlight(rawJson, lastQ) + '</pre></td></tr>'
  );
}

function renderTable(rows) {
  lastRows = rows;
  const wrap = document.getElementById('table-wrap');
  if (!rows.length) {
    wrap.innerHTML = '<p class="text-gray-500 mt-16 text-center text-base">該当するカードがありません</p>';
    return;
  }

  const isTama = currentType === 'tama';
  const isAll  = currentType === 'all';
  const headers = isTama
    ? ['画像', '属性/種族', 'Lv', '名前/ID', 'コスト', 'HP', 'BP', '+HP/+BP', '特性/効果']
    : isAll
      ? ['画像', '属性/種族', 'タイプ', 'Lv', '名前/ID', 'コスト', 'HP', 'BP', '+HP/+BP', '特性/効果']
      : ['画像', '属性/種族', '名前/ID', 'コスト', '特性/効果'];

    const sorted = sortRows(rows);
  const thBase  = 'px-3 pb-2 border-b border-gray-700 bg-gray-800 font-semibold text-gray-300 whitespace-nowrap text-left sticky top-0 z-10';
  const thStyle = ' style="padding-top:1.5rem"';

  let html = '<table class="w-full border-collapse text-xs bg-gray-900"><thead><tr>';
  headers.forEach(h => {
    if (h === '名前/ID') {
      const na = sortKey === 'name'    ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
      const ea = sortKey === 'name_en' ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
      const sarr = s => s ? '<span style="color:#818cf8;font-size:0.65em">' + s + '</span>' : '';
      html += '<th class="' + thBase + '"' + thStyle + '>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="name">名前' + sarr(na) + '</span>' +
        '<span class="text-gray-600 select-none">/</span>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="name_en">ID' + sarr(ea) + '</span>' +
        '</th>';
    } else if (h === '+HP/+BP') {
      const ha = sortKey === 'bonus_hp' ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
      const ba = sortKey === 'bonus_bp' ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
      const sarr = s => s ? '<span style="color:#818cf8;font-size:0.65em">' + s + '</span>' : '';
      html += '<th class="' + thBase + ' text-center"' + thStyle + '>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="bonus_hp">+HP' + sarr(ha) + '</span>' +
        '<span class="text-gray-600 select-none">/</span>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="bonus_bp">+BP' + sarr(ba) + '</span>' +
        '</th>';
    } else if (h === '属性/種族') {
      const aa = sortKey === 'attr_ja' ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
      const ca = sortKey === 'class'   ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
      const sarr = s => s ? '<span style="color:#818cf8;font-size:0.65em">' + s + '</span>' : '';
      html += '<th class="' + thBase + ' text-center"' + thStyle + '>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="attr_ja">属性' + sarr(aa) + '</span>' +
        '<span class="text-gray-600 select-none">/</span>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="class">種族' + sarr(ca) + '</span>' +
        '</th>';
    } else {
      const sk = SORT_KEYS[h];
      const sortCls = sk && sortKey === sk ? (sortDir === 1 ? ' sort-asc' : ' sort-desc') : '';
      const sortAttr = sk ? ' data-sort="' + sk + '"' : '';
      html += '<th class="' + thBase + sortCls + '"' + thStyle + sortAttr + '>' + h + '</th>';
    }
  });
  html += '</tr></thead><tbody>';

  sorted.forEach((r, i) => {
    const zebra = i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800';
    html += buildRowHtml(r, { detailId: 'detail-' + i, depth: 0, zebra });
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;

  // 各本体行に、直後のJSON詳細行への参照を持たせておく
  // (カード名クリックでの参照先行挿入時に、行の末尾を正しく判定するために使う)。
  wrap.querySelectorAll('tbody > tr[data-depth]').forEach(tr => {
    const next = tr.nextElementSibling;
    if (next && next.classList.contains('json-detail')) tr._detailRow = next;
  });
}

// ---- keyword tooltip ----
(function () {
  const tip = document.createElement('div');
  tip.id = 'kw-tooltip';
  document.body.appendChild(tip);

  const sub = document.createElement('div');
  sub.id = 'kw-tooltip-sub';
  document.body.appendChild(sub);

  // Invisible strips that fill the visual gap between a keyword and its
  // tooltip, so hovering through the gap doesn't count as "left" it.
  const bridge = document.createElement('div');
  bridge.id = 'kw-tooltip-bridge';
  document.body.appendChild(bridge);

  const subBridge = document.createElement('div');
  subBridge.id = 'kw-tooltip-sub-bridge';
  document.body.appendChild(subBridge);

  // Main tooltip (A) and nested sub-tooltip (B) each need their own hide
  // timer. They used to share one timer, and "still inside #kw-tooltip"
  // counted as a reason to keep B alive too -- so once B opened, any
  // movement anywhere inside A kept B open forever, since B never got an
  // independent trigger to close.
  let hideMainTimer = null;
  let hideSubTimer = null;

  function hideSubNow() {
    clearTimeout(hideSubTimer);
    sub.style.display = 'none';
    subBridge.style.display = 'none';
  }

  function scheduleHideMain() {
    clearTimeout(hideMainTimer);
    hideMainTimer = setTimeout(() => {
      tip.style.display = 'none';
      bridge.style.display = 'none';
      hideSubNow(); // B can't outlive A
    }, 200);
  }

  function scheduleHideSub() {
    clearTimeout(hideSubTimer);
    hideSubTimer = setTimeout(hideSubNow, 200);
  }

  function cancelHideMain() { clearTimeout(hideMainTimer); }
  function cancelHideSub() { clearTimeout(hideSubTimer); }

  // Position tooltipEl anchored above (or below) kwEl, fixed relative to viewport,
  // and stretch bridgeEl over the gap between them so it stays hoverable.
  function showAt(kwEl, tooltipEl, bridgeEl) {
    // Render off-screen first to measure height.
    tooltipEl.style.left = '-9999px';
    tooltipEl.style.top  = '-9999px';
    tooltipEl.style.display = 'block';
    const r  = kwEl.getBoundingClientRect();
    const tw = tooltipEl.offsetWidth;
    const th = tooltipEl.offsetHeight;
    let x = r.left;
    if (x + tw > window.innerWidth - 8) x = window.innerWidth - tw - 8;
    x = Math.max(4, x);
    const above = (r.top >= th + 12);
    const y = above ? r.top - th - 6 : r.bottom + 6;
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top  = Math.max(4, y) + 'px';

    const gapTop    = above ? (y + th) : r.bottom;
    const gapBottom = above ? r.top    : y;
    bridgeEl.style.left   = Math.min(x, r.left) + 'px';
    bridgeEl.style.top    = gapTop + 'px';
    bridgeEl.style.width  = (Math.max(x + tw, r.right) - Math.min(x, r.left)) + 'px';
    bridgeEl.style.height = Math.max(0, gapBottom - gapTop) + 'px';
    bridgeEl.style.display = 'block';
  }

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('.kw');
    const elHasTip = !!(el && el.dataset.tip);
    const nested = elHasTip && tip.contains(el);

    // Whether the pointer is currently over something that belongs to B
    // (sub-tooltip itself, its bridge, or the nested keyword that opened it)
    // vs. something that belongs to A (main tooltip, its bridge, or a
    // top-level keyword). Being "in B" always counts as also being "in A",
    // since B is conceptually nested inside A.
    const inSub = !!(e.target.closest('#kw-tooltip-sub') || e.target.closest('#kw-tooltip-sub-bridge') || nested);
    const inMain = inSub || !!(e.target.closest('#kw-tooltip') || e.target.closest('#kw-tooltip-bridge') || elHasTip);

    if (inMain) cancelHideMain(); else scheduleHideMain();
    if (inSub) cancelHideSub(); else scheduleHideSub();

    if (!elHasTip) return;
    if (nested) {
      // Nested keyword inside main tooltip -> show sub-tooltip anchored to that keyword.
      sub.innerHTML = el.dataset.tip;
      sub._sourceRow = tip._sourceRow;
      showAt(el, sub, subBridge);
    } else {
      // Main content keyword -> show main tooltip anchored to the keyword.
      hideSubNow();
      tip.innerHTML = el.dataset.tip;
      // デッキカードの詳細ポップアップは専用に幅広・大きめ表示にする
      tip.classList.toggle('deck-detail', el.classList.contains('deck-card'));
      tip._sourceRow = el.closest('tr');
      showAt(el, tip, bridge);
    }
  });

  // Mouse leaving the document entirely (no relatedTarget) fires no
  // corresponding mouseover, so the above logic never runs -- close both.
  document.addEventListener('mouseout', e => {
    if (!e.relatedTarget) {
      scheduleHideMain();
      scheduleHideSub();
    }
  });

  // ---- カード名クリックでの参照先カード展開 (.cardref) ----
  // 行(本体行+JSON詳細行)を1ブロックとして扱い、ブロックの末尾を辿って
  // 「展開済みの子カード行」をすべて飛び越した位置に新しい行を挿入する。
  function blockEnd(mainRow) {
    return mainRow._detailRow || mainRow;
  }

  function subtreeEnd(mainRow) {
    const depth = parseInt(mainRow.dataset.depth || '0', 10);
    let end = blockEnd(mainRow);
    let next = end.nextElementSibling;
    while (next && next.dataset && next.dataset.depth !== undefined && parseInt(next.dataset.depth, 10) > depth) {
      end = blockEnd(next);
      next = end.nextElementSibling;
    }
    return end;
  }

  function removeRowAndSubtree(mainRow) {
    const depth = parseInt(mainRow.dataset.depth || '0', 10);
    const nodes = [mainRow];
    if (mainRow._detailRow) nodes.push(mainRow._detailRow);
    let next = blockEnd(mainRow).nextElementSibling;
    while (next && next.dataset && next.dataset.depth !== undefined && parseInt(next.dataset.depth, 10) > depth) {
      const childMain = next;
      nodes.push(childMain);
      if (childMain._detailRow) nodes.push(childMain._detailRow);
      next = blockEnd(childMain).nextElementSibling;
    }
    nodes.forEach(n => n.remove());
  }

  let refSeq = 0;
  // 展開済み状態は sourceRow (テーブル上に存在し続ける行) + cardId をキーに管理する。
  // クリック元の要素(anchorEl)はツールチップ内の場合、ホバーごとにinnerHTMLで
  // 作り直されて別のDOM要素に化けるため、要素自体に状態を持たせると
  // 「閉じて再度開く」だけで多重展開されてしまう。
  function toggleCardRef(sourceRow, anchorEl) {
    const cardId = anchorEl.dataset.cardId;
    if (!sourceRow._cardRefRows) sourceRow._cardRefRows = new Map();
    const existing = sourceRow._cardRefRows.get(cardId);
    if (existing && existing.isConnected) {
      removeRowAndSubtree(existing);
      sourceRow._cardRefRows.delete(cardId);
      return;
    }
    const card = CARD_INDEX[cardId];
    if (!card) return;
    const depth = parseInt(sourceRow.dataset.depth || '0', 10) + 1;
    const detailId = 'ref-detail-' + (refSeq++);
    const rowHtml = buildRowHtml(card, { detailId, depth });
    const insertAfter = subtreeEnd(sourceRow);
    insertAfter.insertAdjacentHTML('afterend', rowHtml);
    const newMain = insertAfter.nextElementSibling;
    newMain._detailRow = newMain.nextElementSibling;
    sourceRow._cardRefRows.set(cardId, newMain);
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('.cardref');
    if (!el || !el.dataset.cardId) return;
    const sourceRow = tip.contains(el) ? tip._sourceRow : (sub.contains(el) ? sub._sourceRow : el.closest('tr'));
    if (!sourceRow) return;
    toggleCardRef(sourceRow, el);
  });
})();

// 旧 /api/card_index 相当。ALL_CARDS から id(name_en) -> entry の辞書を作る。
let CARD_INDEX = {};
function buildCardIndex() {
  CARD_INDEX = {};
  for (const e of ALL_CARDS) CARD_INDEX[e.name_en] = e;
}

// ==================== デッキ編集 ====================
const DECK_MAX = 60, DECK_MIN = 40, CARD_COPY_MAX = 4;
const DECK_KEY = 'deck-editor-current';
const DECK_PANE_KEY = 'deck-pane-collapsed';
// タマDNA = ゲーム内で選択可能なガーディアン (SpeciesLibrary.Dex の27種)
const DEX_SPECIES = ['Saplee','Vixee','Froxic','Kobou','Talfou','Fifou','Gira','Toxee','DarkSaplee','Cardee','Neiree','Vixel','Frocket','Kobalth','Talisfir','Zephyris','Geardra','Toxica','DarkNeiree','Turtorix','Rott','Anurot','Unary','Bunary','Shovulf','Plowulf','Prisman'];
const DEX_SET = new Set(DEX_SPECIES);
const DECK_TYPE_ORDER = ['tama','appli','patch','virus'];
const DECK_TYPE_LABEL = { tama:'タマ', appli:'アプリ', patch:'パッチ', virus:'ウイルス' };

let deck = { name: '', guardian: 'None', cards: {}, restrict: true };

function loadDeck() {
  try {
    const d = JSON.parse(localStorage.getItem(DECK_KEY) || 'null');
    if (d && typeof d === 'object') {
      deck = { name: d.name || '', guardian: d.guardian || 'None', cards: (d.cards && typeof d.cards === 'object') ? d.cards : {}, restrict: d.restrict !== false };
    }
  } catch (e) {}
}
function saveDeck() { localStorage.setItem(DECK_KEY, JSON.stringify(deck)); }
function deckTotal() { return Object.values(deck.cards).reduce((a, b) => a + b, 0); }

let deckToastTimer = null;
function deckToast(msg) {
  let t = document.getElementById('deck-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'deck-toast';
    t.className = 'fixed left-1/2 -translate-x-1/2 bottom-6 z-[10002] bg-red-700 text-white text-sm px-4 py-2 rounded-lg shadow-lg';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(deckToastTimer);
  deckToastTimer = setTimeout(() => { t.style.display = 'none'; }, 1800);
}

function deckAdd(id) {
  if (!CARD_INDEX[id]) return;
  if (deck.restrict && !CARD_INDEX[id].in_dex) { deckToast('デッキに入れられないカードです'); return; }
  if (deckTotal() >= DECK_MAX) { deckToast('デッキは最大 ' + DECK_MAX + ' 枚までです'); return; }
  const cur = deck.cards[id] || 0;
  if (cur >= CARD_COPY_MAX) { deckToast('同じカードは ' + CARD_COPY_MAX + ' 枚までです'); return; }
  deck.cards[id] = cur + 1;
  saveDeck();
  renderDeck();
}
function deckRemove(id) {
  if (!deck.cards[id]) return;
  deck.cards[id]--;
  if (deck.cards[id] <= 0) delete deck.cards[id];
  saveDeck();
  renderDeck();
}

// カード種別 → 属性順 → HP降順 → 名前 で並べる (ゲームの並び替えに準拠)
function deckSortCmp(a, b) {
  const ea = CARD_INDEX[a] || {}, eb = CARD_INDEX[b] || {};
  let ia = ELEMENT_ORDER.indexOf(ea.attr), ib = ELEMENT_ORDER.indexOf(eb.attr);
  if (ia < 0) ia = 999; if (ib < 0) ib = 999;
  if (ia !== ib) return ia - ib;
  const ha = Number(ea.hp) || 0, hb = Number(eb.hp) || 0;
  if (ha !== hb) return hb - ha;
  return String(ea.name || a).localeCompare(String(eb.name || b), 'ja');
}

function deckCardDetailHtml(r) {
  const cls = r.class_ja || r.class;
  // 左: 基本情報
  let basic = '<div class="deck-tip-name"><span class="card-name">' + esc(r.name) + '</span>' +
    ' <span class="card-id" style="color:#94a3b8;font-weight:normal">' + esc(r.name_en) + '</span></div>';
  const attrColor = ELEMENT_COLOR[r.attr];
  const attrSpan = '<span class="filt" data-attr="' + esc(r.attr) + '"' +
    (attrColor ? ' style="color:' + attrColor + '"' : '') + '>' + esc(ELEMENT_JA[r.attr] || r.attr) + '</span>';
  const tribeSpan = r.class
    ? '<span class="filt" data-tribe="' + esc(r.class) + '" style="color:' + TRIBE_TEXT_COLOR + '">' + esc(cls) + '</span>'
    : '';
  const typeSpan = '<span class="filt" style="color:#fff" data-set-type="' + esc(r.card_type) + '">' + (TYPE_LABELS[r.card_type] || r.card_type) + '</span>';
  basic += '<div class="deck-tip-meta">' + attrSpan +
    (tribeSpan ? ' / ' + tribeSpan : '') + ' ・ ' + typeSpan + '</div>';
  if (r.card_type === 'tama') {
    basic += '<div class="deck-tip-stat">Lv ' + (r.lv === 0 ? '?' : esc(r.lv)) +
      '　HP ' + esc(r.hp) + ' / BP ' + esc(r.bp) + '</div>';
  }
  if (r.cost_ja) basic += '<div class="deck-tip-cost">コスト: ' + r.cost_ja + '</div>';

  // 右: 特性/効果
  let eff = '';
  if (r.effect_ja) eff += '<div class="effect-text">' + r.effect_ja + '</div>';
  if (r.flags_ja) eff += '<div class="effect-text" style="margin-top:4px">' + r.flags_ja + '</div>';

  let h = '<div class="deck-tip' + (eff ? ' deck-tip-2col' : '') + '">' +
    '<div class="deck-tip-basic">' + basic + '</div>';
  if (eff) h += '<div class="deck-tip-eff">' + eff + '</div>';
  h += '</div>';
  return h;
}

function deckTileHtml(id) {
  const e = CARD_INDEX[id];
  const n = deck.cards[id];
  const tip = esc(deckCardDetailHtml(e));
  const thumbBorder = ELEMENT_COLOR[e.attr] || '#4b5563';
  return '<div class="deck-card kw" data-card-id="' + esc(id) + '" data-tip="' + tip + '" >' +
    '<img src="' + esc(e.img_url) + '" class="deck-thumb" style="border-color:' + esc(thumbBorder) + '" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
    '<span class="deck-count">' + n + '</span></div>';
}

function renderTamaButton() {
  const icon = document.getElementById('tama-icon');
  const label = document.getElementById('tama-label');
  if (deck.guardian && deck.guardian !== 'None' && DEX_SET.has(deck.guardian)) {
    icon.src = 'static/creatures/' + deck.guardian + '_Icon.png';
    icon.classList.remove('hidden');
    label.textContent = 'タマDNA: ' + (SPECIES_NAME[deck.guardian] || deck.guardian);
  } else {
    icon.classList.add('hidden');
    label.textContent = 'タマDNA: 未選択';
  }
}

function syncTableRestrictClass() {
  document.getElementById('table-wrap').classList.toggle('restrict-on', !!deck.restrict);
}

function renderDeck() {
  syncTableRestrictClass();
  const total = deckTotal();
  const badge = document.getElementById('deck-total-badge');
  badge.textContent = total + ' / ' + DECK_MAX;
  badge.classList.toggle('bg-amber-700', total > 0 && total < DECK_MIN);
  badge.classList.toggle('bg-green-700', total >= DECK_MIN && total <= DECK_MAX);
  badge.classList.toggle('bg-gray-600', total === 0);

  const counts = { tama: 0, appli: 0, patch: 0, virus: 0 };
  Object.entries(deck.cards).forEach(([id, n]) => {
    const e = CARD_INDEX[id];
    if (e && counts[e.card_type] != null) counts[e.card_type] += n;
  });
  document.getElementById('deck-breakdown').textContent =
    DECK_TYPE_ORDER.map(t => DECK_TYPE_LABEL[t] + ':' + (counts[t] || 0)).join('　');
  document.getElementById('deck-warning').classList.toggle('hidden', total === 0 || total >= DECK_MIN);
  document.getElementById('deck-name').textContent = deck.name || '(無名デッキ)';
  document.getElementById('deck-restrict-flag').checked = !!deck.restrict;
  renderTamaButton();

  const grid = document.getElementById('deck-grid');
  if (total === 0) {
    grid.innerHTML = '<p class="text-gray-500 text-xs py-4 text-center">検索結果のカード画像をクリックしてデッキに追加</p>';
    return;
  }
  let html = '';
  DECK_TYPE_ORDER.forEach(type => {
    const ids = Object.keys(deck.cards).filter(id => (CARD_INDEX[id] || {}).card_type === type);
    if (!ids.length) return;
    ids.sort(deckSortCmp);
    html += '<div class="deck-type-group"><span class="deck-type-label">' + DECK_TYPE_LABEL[type] + '</span>' +
            deckTileHtml(ids[0]) + '</div>';
    ids.slice(1).forEach(id => { html += deckTileHtml(id); });
  });
  grid.innerHTML = html;
}

function toggleDeckPane() {
  const body = document.getElementById('deck-body');
  const collapse = body.style.display !== 'none';
  body.style.display = collapse ? 'none' : '';
  document.getElementById('deck-caret').textContent = collapse ? '▶' : '▼';
  localStorage.setItem(DECK_PANE_KEY, collapse ? '1' : '0');
}
function applyDeckPaneState() {
  const collapsed = localStorage.getItem(DECK_PANE_KEY) === '1';
  document.getElementById('deck-body').style.display = collapsed ? 'none' : '';
  document.getElementById('deck-caret').textContent = collapsed ? '▶' : '▼';
}

function editDeckName() {
  const span = document.getElementById('deck-name');
  span.contentEditable = 'true';
  span.textContent = deck.name;
  span.focus();
  const range = document.createRange();
  range.selectNodeContents(span);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  const finish = () => {
    span.contentEditable = 'false';
    deck.name = span.textContent.trim().slice(0, 20);
    saveDeck();
    renderDeck();
  };
  span.addEventListener('blur', finish, { once: true });
  span.addEventListener('keydown', function kd(e) {
    if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
    else if (e.key === 'Escape') { span.textContent = deck.name; span.blur(); }
  });
}

function clearDeck() {
  if (deckTotal() === 0) return;
  if (!confirm('デッキのカードを全てクリアします。よろしいですか？')) return;
  deck.cards = {};
  saveDeck();
  renderDeck();
}

function tamaName(s) { return SPECIES_NAME[s] || s; }

function showTamaDesc(s) {
  const nameEl = document.getElementById('tama-desc-name');
  const textEl = document.getElementById('tama-desc-text');
  if (!s || s === 'None') {
    nameEl.textContent = '未選択';
    textEl.innerHTML = '<span class="text-gray-500">タマDNAを設定しません。</span>';
    return;
  }
  nameEl.textContent = tamaName(s);
  textEl.innerHTML = SPECIES_DESC[s] || '<span class="text-gray-500">（特別な開始効果はありません）</span>';
}

function openTamaPicker() {
  const grid = document.getElementById('tama-grid');
  let html = '<div class="tama-pick rounded p-1 hover:bg-gray-700 flex flex-col items-center justify-center border border-gray-600" data-species="None">' +
    '<div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:1.6em">∅</div>' +
    '<span class="text-[10px] text-gray-300 mt-0.5 leading-tight text-center overflow-hidden" style="height:2.6em">未選択</span></div>';
  DEX_SPECIES.forEach(s => {
    const sel = (s === deck.guardian) ? ' ring-2 ring-indigo-400' : '';
    html += '<div class="tama-pick rounded p-1 hover:bg-gray-700 flex flex-col items-center border border-transparent' + sel + '" data-species="' + s + '">' +
      '<img src="static/creatures/' + s + '_Icon.png" style="width:48px;height:48px;object-fit:contain" onerror="this.style.visibility=\'hidden\'">' +
      '<span class="text-[10px] text-gray-300 mt-0.5 leading-tight text-center overflow-hidden" style="height:2.6em">' + tamaName(s) + '</span></div>';
  });
  grid.innerHTML = html;
  showTamaDesc(deck.guardian);  // 現在の選択を初期表示
  document.getElementById('tama-modal').classList.remove('hidden');
}
function closeTamaPicker() {
  document.getElementById('tama-modal').classList.add('hidden');
}
function selectGuardian(s) {
  deck.guardian = DEX_SET.has(s) ? s : 'None';
  saveDeck();
  renderTamaButton();
  closeTamaPicker();
}

function deckSortedCardsArray() {
  const ids = Object.keys(deck.cards);
  ids.sort((a, b) => {
    let ta = DECK_TYPE_ORDER.indexOf((CARD_INDEX[a] || {}).card_type);
    let tb = DECK_TYPE_ORDER.indexOf((CARD_INDEX[b] || {}).card_type);
    if (ta < 0) ta = 9; if (tb < 0) tb = 9;
    if (ta !== tb) return ta - tb;
    return deckSortCmp(a, b);
  });
  return ids.map(id => ({ Id: id, Count: deck.cards[id] }));
}
function exportDeck() {
  const obj = { Cards: deckSortedCardsArray(), Guardian: deck.guardian || 'None', Name: deck.name || '', Background: '', Sleeve: null };
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const fname = (deck.name && deck.name.trim() ? deck.name.trim() : 'deck').replace(/[\\/:*?"<>|]/g, '_');
  a.href = URL.createObjectURL(blob);
  a.download = 'deck_' + fname + '.txt';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

function importDeck() { document.getElementById('deck-file-input').click(); }
function onDeckFile(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); } catch (err) { alert('JSONの解析に失敗しました'); return; }
    applyImportedDeck(data);
  };
  reader.readAsText(file);
}
function applyImportedDeck(data) {
  if (!data || typeof data !== 'object') { alert('デッキ形式が不正です'); return; }
  const cards = {};
  let total = 0, missing = 0, clamped = false;
  (Array.isArray(data.Cards) ? data.Cards : []).forEach(c => {
    const id = c && c.Id;
    let cnt = Math.max(0, parseInt(c && c.Count, 10) || 0);
    if (!id || id === 'None' || id === 'Blank' || !CARD_INDEX[id]) { missing++; return; }
    cnt = Math.min(cnt, CARD_COPY_MAX);
    if (total + cnt > DECK_MAX) { cnt = Math.max(0, DECK_MAX - total); clamped = true; }
    if (cnt <= 0) return;
    cards[id] = (cards[id] || 0) + cnt;
    total += cnt;
  });
  let guardian = 'None';
  if (data.Guardian && DEX_SET.has(data.Guardian)) guardian = data.Guardian;
  const hasOutOfDeckCard = Object.keys(cards).some(id => !(CARD_INDEX[id] || {}).in_dex);
  deck = { name: (data.Name || '').toString().slice(0, 20), guardian, cards, restrict: !hasOutOfDeckCard };
  saveDeck();
  renderDeck();
  if (missing || clamped) {
    let msg = 'デッキを読み込みました。';
    if (missing) msg += '\n未知/対象外のカード ' + missing + ' 件をスキップしました。';
    if (clamped) msg += '\n60枚を超えるため一部の枚数を調整しました。';
    alert(msg);
  }
}

// ---- イベント登録(データ非依存) ----
// デッキ内カードクリックで1枚削除 / Shift+クリックで1枚追加
document.getElementById('deck-grid').addEventListener('click', e => {
  const tile = e.target.closest('.deck-card');
  if (!tile) return;
  if (e.shiftKey) deckAdd(tile.dataset.cardId);
  else deckRemove(tile.dataset.cardId);
});
// デッキ内カードを右クリック → 検索結果でそのカードを中央にフォーカス
document.getElementById('deck-grid').addEventListener('contextmenu', e => {
  const tile = e.target.closest('.deck-card');
  if (!tile) return;
  e.preventDefault();
  focusCardInResults(tile.dataset.cardId);
});
// タマDNAピッカー選択
document.getElementById('tama-grid').addEventListener('click', e => {
  const pick = e.target.closest('.tama-pick');
  if (pick) selectGuardian(pick.dataset.species);
});
// タマDNAピッカー: ホバー中の種族の説明を下部パネルに表示
document.getElementById('tama-grid').addEventListener('mouseover', e => {
  const pick = e.target.closest('.tama-pick');
  if (pick) showTamaDesc(pick.dataset.species);
});
// デッキ読込ファイル選択
document.getElementById('deck-file-input').addEventListener('change', onDeckFile);
// 検索結果: 画像セル(パディング含む)のクリックでのみ1枚追加 (既存のクリック要素は除外)
document.getElementById('table-wrap').addEventListener('click', e => {
  if (e.target.closest('.kw, .cardref, [data-attr], [data-tribe], [data-detail-toggle], [data-set-type], [data-sort]')) return;
  if (!e.target.closest('td:first-child')) return;
  const tr = e.target.closest('tr[data-card-id]');
  if (tr) deckAdd(tr.dataset.cardId);
});

// ==================== フィルタのデフォルト管理 ====================
const FILTER_DEFAULTS_KEY = 'filter-defaults-v1';
const BUILTIN_FILTER_DEFAULTS = {
  type: 'tama', q: '', targets: ['name', 'effect'], lv: '',
  attrs: { list: [], dark: true }, tribes: [],
  range: { dex: true, spawn: true, npc: false },
};
const FILTER_SECTIONS = ['type', 'q', 'targets', 'lv', 'attrs', 'tribes', 'range'];
const TARGET_IDS = ['name', 'id', 'cost', 'effect', 'json'];

let FILTER_DEFAULTS = (() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(FILTER_DEFAULTS_KEY) || '{}'); } catch (e) { saved = {}; }
  return Object.assign({}, structuredClone(BUILTIN_FILTER_DEFAULTS), saved);
})();

function _normVal(v) {
  return JSON.stringify(v, (k, val) => Array.isArray(val) ? [...val].sort() : val);
}

function readSection(sec) {
  switch (sec) {
    case 'type': return currentType;
    case 'q': return document.getElementById('q').value;
    case 'targets': return TARGET_IDS.filter(t => document.getElementById('target-' + t).checked);
    case 'lv': return currentLv;
    case 'attrs': return { list: [...selectedAttrs], dark: document.getElementById('include-dark').checked };
    case 'tribes': return [...selectedTribes];
    case 'range': return {
      dex: document.getElementById('show-dex').checked,
      spawn: document.getElementById('show-spawn').checked,
      npc: document.getElementById('show-npc').checked,
    };
  }
}

// セクションの状態を value に設定する(silent=trueなら検索しない)
function applySection(sec, value, silent) {
  switch (sec) {
    case 'type': setType(value, true); break;
    case 'q':
      document.getElementById('q').value = value;
      updateKwClearBtn();
      break;
    case 'targets':
      TARGET_IDS.forEach(t => { document.getElementById('target-' + t).checked = value.includes(t); });
      break;
    case 'lv': setLv(value, true); break;
    case 'attrs':
      selectedAttrs = new Set(value.list);
      document.getElementById('include-dark').checked = value.dark;
      updateAttrHighlight();
      break;
    case 'tribes':
      selectedTribes = new Set(value);
      updateTribeHighlight();
      break;
    case 'range':
      document.getElementById('show-dex').checked = value.dex;
      document.getElementById('show-spawn').checked = value.spawn;
      document.getElementById('show-npc').checked = value.npc;
      break;
  }
  if (!silent) doSearch();
}

function sectionIsDefault(sec) {
  return _normVal(readSection(sec)) === _normVal(FILTER_DEFAULTS[sec]);
}

function resetSection(sec) {
  applySection(sec, structuredClone(FILTER_DEFAULTS[sec]), false);
}

function resetAllFilters() {
  FILTER_SECTIONS.forEach(sec => applySection(sec, structuredClone(FILTER_DEFAULTS[sec]), true));
  doSearch();
}

function saveSectionDefault(sec) {
  FILTER_DEFAULTS[sec] = readSection(sec);
  localStorage.setItem(FILTER_DEFAULTS_KEY, JSON.stringify(FILTER_DEFAULTS));
  updateFilterResetButtons();
  deckToast('「' + (SECTION_LABELS[sec] || sec) + '」を既定値として保存しました');
}

const SECTION_LABELS = {
  type: 'カードタイプ', q: 'キーワード', targets: '検索対象', lv: 'レベル',
  attrs: '属性', tribes: '種族', range: 'カード範囲',
};

function updateFilterResetButtons() {
  let allDefault = true;
  FILTER_SECTIONS.forEach(sec => {
    const isDef = sectionIsDefault(sec);
    if (!isDef) allDefault = false;
    document.querySelectorAll('.sec-reset[data-sec="' + sec + '"]').forEach(btn => { btn.disabled = isDef; });
  });
  const allBtn = document.getElementById('reset-all-btn');
  if (allBtn) allBtn.disabled = allDefault;
}

// 動的生成HTML(検索結果テーブル/効果テキスト/デッキ詳細ポップアップ)内の
// クリック操作をイベント委譲でまとめて処理する(旧: インライン onclick)。
document.addEventListener('click', e => {
  const filt = e.target.closest('[data-attr], [data-tribe]');
  if (filt) {
    if (filt.dataset.attr) onAttrClick(filt.dataset.attr, e);
    else onTribeClick(filt.dataset.tribe, e);
    return;
  }
  const typeEl = e.target.closest('[data-set-type]');
  if (typeEl) { setType(typeEl.dataset.setType); return; }
  const detEl = e.target.closest('[data-detail-toggle]');
  if (detEl) { toggleDetail(detEl.dataset.detailToggle); return; }
  const sortEl = e.target.closest('[data-sort]');
  if (sortEl) { onHeaderClick(sortEl.dataset.sort); return; }
});

// ---- ショートカット一覧モーダル ----
const SHORTCUTS = [
  ['検索結果のカード画像をクリック', 'デッキに1枚追加'],
  ['デッキのカードをクリック', 'デッキから1枚削除'],
  ['Shift + デッキのカードをクリック', 'デッキに1枚追加'],
  ['デッキのカードを右クリック', '検索結果で中央にフォーカス（表示できない場合は原因の絞り込みを解除）'],
  ['属性 / 種族をクリック', 'その条件で絞り込み（再クリックで解除）'],
  ['Ctrl / ⌘ + 属性・種族をクリック', '複数選択（トグル）'],
  ['コスト・効果内の属性 / 種族をクリック', 'その条件で絞り込み'],
  ['F', 'マウス位置の語（属性/種族/名前など）でキーワード検索'],
  ['Esc', 'モーダルを閉じる / 全フィルタを既定値に戻す'],
  ['?', 'このショートカット一覧を開く'],
];

function renderShortcutTable() {
  const t = document.getElementById('shortcut-table');
  t.innerHTML = SHORTCUTS.map(([k, d]) =>
    '<tr class="border-b border-gray-700">' +
    '<td class="py-1.5 pr-3 align-top whitespace-nowrap"><kbd class="bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs">' + esc(k) + '</kbd></td>' +
    '<td class="py-1.5 text-gray-300">' + esc(d) + '</td></tr>'
  ).join('');
}

function openShortcutModal() {
  renderShortcutTable();
  document.getElementById('shortcut-modal').classList.remove('hidden');
}

function closeShortcutModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('shortcut-modal').classList.add('hidden');
}

// 入力欄にフォーカスがある時はキーボードショートカットを無効にする
function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const sc = document.getElementById('shortcut-modal');
    const tama = document.getElementById('tama-modal');
    if (sc && !sc.classList.contains('hidden')) { sc.classList.add('hidden'); return; }
    if (tama && !tama.classList.contains('hidden')) { closeTamaPicker(); return; }
    // 入力欄/編集中はフォーカスを外すだけ(意図しないリセットを防ぐ)
    if (isTypingTarget(e.target)) { if (e.target.blur) e.target.blur(); return; }
    resetAllFilters();  // Escape で全フィルタをデフォルトに戻す
    return;
  }
  if (isTypingTarget(e.target)) return;
  if (e.key === '?') { e.preventDefault(); openShortcutModal(); return; }
  if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    keywordSearchAtCursor();
  }
});

// ==================== なんでもキーワード検索 ====================
let _lastMouse = { x: 0, y: 0 };
document.addEventListener('mousemove', e => { _lastMouse.x = e.clientX; _lastMouse.y = e.clientY; }, { passive: true });

// マウス位置の要素から検索キーワードを抽出する(.filt/.kw/.cardref/属性・種族バッジ/名前/ID)
const KW_TOKEN_SELECTOR = '.filt, .kw, .cardref, .card-name, .card-id, [data-attr], [data-tribe], [data-detail-toggle]';

function keywordFromElement(el) {
  if (!el) return '';
  let tok = el.closest(KW_TOKEN_SELECTOR);
  if (!tok) {
    // セルの余白などにヒットした場合、配下の候補が複数あると連結して誤検出するため
    // (例: 名前とIDが連結して「どんぐりの雨AcornRain」になる)、マウス位置に最も近い候補だけを採用する
    let bestDist = Infinity;
    el.querySelectorAll(KW_TOKEN_SELECTOR).forEach(c => {
      const r = c.getBoundingClientRect();
      const dx = Math.max(r.left - _lastMouse.x, 0, _lastMouse.x - r.right);
      const dy = Math.max(r.top - _lastMouse.y, 0, _lastMouse.y - r.bottom);
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) { bestDist = dist; tok = c; }
    });
  }
  let text = tok ? tok.textContent : el.textContent;
  text = (text || '').trim();
  // トークンが取れない/長すぎる場合は採用しない(セル全体などの誤検出を避ける)
  if (!tok && text.length > 30) return '';
  return text;
}

function keywordSearchAtCursor() {
  // テキスト選択があれば最優先
  const sel = (window.getSelection && window.getSelection().toString() || '').trim();
  let kw = sel;
  if (!kw) {
    const el = document.elementFromPoint(_lastMouse.x, _lastMouse.y);
    kw = keywordFromElement(el);
  }
  if (!kw) return;
  const input = document.getElementById('q');
  input.value = kw;
  updateKwClearBtn();
  doSearch();
  commitKwHistory();  // 入力欄をフォーカスしないため、blurに頼らず明示的に履歴へ反映する
}

// ==================== デッキカード→検索結果フォーカス ====================
// 現在のフィルタが entry を除外している条件だけを「指定なし」に緩める。
function relaxFiltersFor(e) {
  if (currentType !== 'all' && e.card_type !== currentType) setType('all', true);
  if (currentLv && String(e.lv) !== currentLv) setLv('', true);
  if (selectedAttrs.size && !effectiveAttrs().has(e.attr)) { selectedAttrs.clear(); updateAttrHighlight(); }
  if (selectedTribes.size && !selectedTribes.has(e.class)) { selectedTribes.clear(); updateTribeHighlight(); }
  const isNpc = !e.in_dex && !e.is_spawnable;
  if (e.in_dex && !document.getElementById('show-dex').checked) document.getElementById('show-dex').checked = true;
  if (e.is_spawnable && !document.getElementById('show-spawn').checked) document.getElementById('show-spawn').checked = true;
  if (isNpc && !document.getElementById('show-npc').checked) document.getElementById('show-npc').checked = true;
  const q = document.getElementById('q').value.trim();
  if (q) {
    const targets = TARGET_IDS.filter(t => document.getElementById('target-' + t).checked);
    const ql = q.toLowerCase();
    const match = targets.some(t => SEARCH_FIELD_FN[t] && SEARCH_FIELD_FN[t](e).toLowerCase().includes(ql));
    if (!match) { document.getElementById('q').value = ''; updateKwClearBtn(); }
  }
}

function scrollAndFlashRow(row) {
  row.scrollIntoView({ block: 'center', behavior: 'auto' });
  row.classList.remove('row-flash');
  void row.offsetWidth;  // アニメーション再起動のためリフロー
  row.classList.add('row-flash');
  setTimeout(() => row.classList.remove('row-flash'), 1000);
}

function focusCardInResults(id) {
  const e = CARD_INDEX[id];
  if (!e) return;
  let row = document.querySelector('tr[data-card-id="' + CSS.escape(id) + '"]');
  if (!row) {
    // 現在の検索結果に無い → 原因のフィルタを緩めて再検索
    relaxFiltersFor(e);
    doSearch();
    row = document.querySelector('tr[data-card-id="' + CSS.escape(id) + '"]');
  }
  if (row) scrollAndFlashRow(row);
  else deckToast('検索結果に表示できませんでした');
}

// ---- 初期化(データ読み込み後) ----
async function init() {
  const [meta, cards] = await Promise.all([
    fetch('data/meta.json').then(r => r.json()),
    fetch('data/cards.json').then(r => r.json()),
  ]);
  ATTRS         = meta.attrs;
  TRIBES        = meta.tribes;
  TRIBES_JA     = meta.tribes_ja;
  ELEMENT_JA    = meta.element_ja;
  ELEMENT_ORDER = meta.element_order;
  ELEMENT_COLOR = meta.element_color;
  SPECIES_DESC  = meta.species_desc;
  SPECIES_NAME  = meta.species_name;
  ALL_CARDS     = cards;
  buildCardIndex();

  buildAttrList();
  buildTribeList();
  // 保存済みの既定値があれば起動時に適用する
  FILTER_SECTIONS.forEach(sec => applySection(sec, structuredClone(FILTER_DEFAULTS[sec]), true));
  updateKwClearBtn();
  loadDeck();
  applyDeckPaneState();
  renderDeck();
  doSearch();
}

// ---- 静的UI(index.html)のイベント登録 ----
// 旧: インライン on* 属性。すべて addEventListener へ移行した。
function wireStaticControls() {
  const $ = id => document.getElementById(id);
  // ヘッダー
  $('reset-all-btn').addEventListener('click', resetAllFilters);
  $('shortcut-btn').addEventListener('click', openShortcutModal);
  // 各セクションの「戻す」「保存」
  document.querySelectorAll('.sec-reset[data-sec]').forEach(b =>
    b.addEventListener('click', () => resetSection(b.dataset.sec)));
  document.querySelectorAll('.sec-save[data-sec]').forEach(b =>
    b.addEventListener('click', () => saveSectionDefault(b.dataset.sec)));
  // カードタイプ
  TYPES.forEach(t => $('btn-' + t).addEventListener('click', () => setType(t)));
  // キーワード
  $('q').addEventListener('input', onKwInput);
  $('q').addEventListener('keydown', onKwKeydown);
  $('q').addEventListener('blur', commitKwHistory);
  $('kw-clear').addEventListener('click', clearKw);
  $('kw-history-btn').addEventListener('click', toggleKwHistory);
  // 検索対象 / カード範囲のチェックボックス
  ['target-name', 'target-id', 'target-cost', 'target-effect', 'target-json',
   'show-dex', 'show-spawn', 'show-npc'].forEach(id =>
    $(id).addEventListener('change', doSearch));
  // レベル
  [['lv-all', ''], ['lv-0', '0'], ['lv-1', '1'], ['lv-2', '2'], ['lv-3', '3'], ['lv-4', '4']]
    .forEach(([id, v]) => $(id).addEventListener('click', () => setLv(v)));
  // 属性: 闇属性を含む
  $('include-dark').addEventListener('change', () => { updateAttrHighlight(); doSearch(); });
  // デッキ編集ペイン
  $('deck-toggle-bar').addEventListener('click', toggleDeckPane);
  $('tama-btn').addEventListener('click', openTamaPicker);
  $('deck-name').addEventListener('click', editDeckName);
  $('deck-restrict-flag').addEventListener('change', function () {
    deck.restrict = this.checked; saveDeck(); syncTableRestrictClass();
  });
  $('deck-import').addEventListener('click', importDeck);
  $('deck-export').addEventListener('click', exportDeck);
  $('deck-clear').addEventListener('click', clearDeck);
  // タマDNA選択モーダル(背景クリック / ×ボタンで閉じる)
  const tamaModal = $('tama-modal');
  tamaModal.addEventListener('click', e => { if (e.target === tamaModal) closeTamaPicker(); });
  $('tama-close').addEventListener('click', closeTamaPicker);
  // ショートカット一覧モーダル(背景クリック / ×ボタンで閉じる)
  const scModal = $('shortcut-modal');
  scModal.addEventListener('click', closeShortcutModal);
  $('shortcut-close').addEventListener('click', () => closeShortcutModal());
}

wireStaticControls();
init();
