// 検索結果テーブルの描画(行HTML生成・ソート・JSON詳細トグル)。
import { state } from './state.js';
import { ATTR_COLORS, TYPE_LABELS, SORT_KEYS } from './constants.js';
import { esc, highlight, highlightHtml } from './utils.js';

export function attrBadge(a) {
  const color = ATTR_COLORS[a] || 'bg-gray-100 text-gray-700';
  const ja = state.ELEMENT_JA[a] || a;
  const cls = 'px-2 py-0.5 rounded-full text-xs font-medium ' + color + ' whitespace-nowrap' + (a ? ' cursor-pointer hover:opacity-80' : '');
  const data = a ? ' data-attr="' + esc(a) + '"' : '';
  return '<span class="' + cls + '"' + data + '>' + ja + '</span>';
}

// 属性バッジと違い背景色を付けない(属性色と紛らわしいため)。特性/効果列と同じプレーンな見た目で、
// クリックでそのタイプに絞り込める(data-set-type、main.js のグローバルクリック委譲で処理)。
export function typeBadge(t) {
  return '<span class="cursor-pointer hover:underline" data-set-type="' + esc(t) + '">' + (TYPE_LABELS[t] || t) + '</span>';
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

export function toggleDetail(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}

function sortRows(rows) {
  if (!state.sortKey) return rows;
  return [...rows].sort((a, b) => {
    const av = a[state.sortKey] != null ? a[state.sortKey] : '';
    const bv = b[state.sortKey] != null ? b[state.sortKey] : '';
    if (['cost','lv','hp','bp','bonus_hp','bonus_bp'].includes(state.sortKey)) {
      return (Number(av) - Number(bv)) * state.sortDir;
    }
    return String(av).localeCompare(String(bv), 'ja') * state.sortDir;
  });
}

export function onHeaderClick(key) {
  if (state.sortKey === key) state.sortDir *= -1;
  else { state.sortKey = key; state.sortDir = 1; }
  renderTable(state.lastRows);
}

// 1枚のカード行(本体行 + JSON詳細行)のHTMLを返す。
// 通常の検索結果一覧と、カード名クリックで展開する参照先カード行の両方で共用する。
export function buildRowHtml(r, opts) {
  const isTama = state.currentType === 'tama';
  const isAll  = state.currentType === 'all';
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
  const thumbBorder = state.ELEMENT_COLOR[r.attr] || '#4b5563';
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
    '<div class="font-semibold text-gray-100">' + connectMark + '<span class="card-name">' + highlight(r.name, state.lastQ) + '</span>' + nameBadges + '</div>' +
    '<div class="text-gray-500 text-xs cursor-pointer hover:underline inline-block" data-detail-toggle="' + detailId + '" title="クリックでJSON表示">' + highlight(r.name_en, state.lastQ) + '</div>' +
    '</td>';
  const flagsHtml = fmtFlags(r);
  const flagsEffCell =
    '<td class="' + tdBase + ' effect-cell text-gray-300">' +
    (flagsHtml && eff
      ? '<div class="effect-text">' + highlightHtml(eff, state.lastQ) + '</div><div class="effect-text" style="margin-top:4px;border-top:1px solid #374151;padding-top:4px">' + highlightHtml(flagsHtml, state.lastQ) + '</div>'
      : '<div class="effect-text">' + highlightHtml(flagsHtml || eff, state.lastQ) + '</div>') +
    '</td>';
  if (isTama) {
    cols =
      imgCell +
      attrClassCell +
      '<td class="' + tdBase + ' text-center">' + lvCell + '</td>' +
      nameIdCell +
      '<td class="' + tdBase + ' whitespace-nowrap">' + highlightHtml(fmtCost(r), state.lastQ) + '</td>' +
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
      '<td class="' + tdBase + ' whitespace-nowrap">' + highlightHtml(fmtCost(r), state.lastQ) + '</td>' +
      '<td class="' + tdBase + ' text-center font-mono text-gray-200">' + (r.hp !== '' ? esc(r.hp) : '-') + '</td>' +
      '<td class="' + tdBase + ' text-center font-mono text-gray-200">' + (r.bp !== '' ? esc(r.bp) : '-') + '</td>' +
      '<td class="' + tdBase + ' text-center">' + fmtBonus(r) + '</td>' +
      flagsEffCell;
  } else {
    cols =
      imgCell +
      attrClassCell +
      nameIdCell +
      '<td class="' + tdBase + ' whitespace-nowrap">' + highlightHtml(fmtCost(r), state.lastQ) + '</td>' +
      flagsEffCell;
  }
  const rawJson = r.raw_json || '(データなし)';
  const rowBg = depth > 0 ? '' : (opts.zebra || 'bg-gray-900');
  const rowStyle = depth > 0 ? ' style="background:rgba(99,102,241,0.07)"' : '';
  return (
    '<tr class="' + rowBg + '" data-depth="' + depth + '" data-card-id="' + esc(r.name_en) + '" data-addable="' + (r.in_dex ? '1' : '0') + '"' + rowStyle + '>' + cols + '</tr>' +
    '<tr id="' + detailId + '" class="json-detail bg-gray-950" style="display:none"><td colspan="' + colCount + '" class="px-4 py-2 border-b border-gray-700"><pre>' + highlight(rawJson, state.lastQ) + '</pre></td></tr>'
  );
}

export function renderTable(rows) {
  state.lastRows = rows;
  const wrap = document.getElementById('table-wrap');
  if (!rows.length) {
    wrap.innerHTML = '<p class="text-gray-500 mt-16 text-center text-base">該当するカードがありません</p>';
    return;
  }

  const isTama = state.currentType === 'tama';
  const isAll  = state.currentType === 'all';
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
      const na = state.sortKey === 'name'    ? (state.sortDir === 1 ? ' ▲' : ' ▼') : '';
      const ea = state.sortKey === 'name_en' ? (state.sortDir === 1 ? ' ▲' : ' ▼') : '';
      const sarr = s => s ? '<span style="color:#818cf8;font-size:0.65em">' + s + '</span>' : '';
      html += '<th class="' + thBase + '"' + thStyle + '>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="name">名前' + sarr(na) + '</span>' +
        '<span class="text-gray-600 select-none">/</span>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="name_en">ID' + sarr(ea) + '</span>' +
        '</th>';
    } else if (h === '+HP/+BP') {
      const ha = state.sortKey === 'bonus_hp' ? (state.sortDir === 1 ? ' ▲' : ' ▼') : '';
      const ba = state.sortKey === 'bonus_bp' ? (state.sortDir === 1 ? ' ▲' : ' ▼') : '';
      const sarr = s => s ? '<span style="color:#818cf8;font-size:0.65em">' + s + '</span>' : '';
      html += '<th class="' + thBase + ' text-center"' + thStyle + '>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="bonus_hp">+HP' + sarr(ha) + '</span>' +
        '<span class="text-gray-600 select-none">/</span>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="bonus_bp">+BP' + sarr(ba) + '</span>' +
        '</th>';
    } else if (h === '属性/種族') {
      const aa = state.sortKey === 'attr_ja' ? (state.sortDir === 1 ? ' ▲' : ' ▼') : '';
      const ca = state.sortKey === 'class'   ? (state.sortDir === 1 ? ' ▲' : ' ▼') : '';
      const sarr = s => s ? '<span style="color:#818cf8;font-size:0.65em">' + s + '</span>' : '';
      html += '<th class="' + thBase + ' text-center"' + thStyle + '>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="attr_ja">属性' + sarr(aa) + '</span>' +
        '<span class="text-gray-600 select-none">/</span>' +
        '<span class="cursor-pointer hover:text-indigo-300" data-sort="class">種族' + sarr(ca) + '</span>' +
        '</th>';
    } else {
      const sk = SORT_KEYS[h];
      const sortCls = sk && state.sortKey === sk ? (state.sortDir === 1 ? ' sort-asc' : ' sort-desc') : '';
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
