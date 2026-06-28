// 検索結果テーブルの描画。列定義(COLUMNS)を、レイアウトの有効列順(activeOrder)で
// 並べて 1 回ループ生成する。列の D&D 並べ替え・列幅リサイズもここで配線する。
import { state } from './state.js';
import { ATTR_COLORS, TYPE_LABELS } from './constants.js';
import { esc, highlight, highlightHtml } from './utils.js';
import { activeOrder, layout, moveColumn, updateLayoutResetButton } from './layout.js';
import { deckCardDetailHtml } from './deck.js';

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

// ==================== 列定義(COLUMNS) ====================
// 各列: { label, defaultWidth, flex?, align?, sortKey?, header(), cell(r, ctx) }
//  - header(): <th> の中身(ラベル+ソート矢印)を返す。
//  - cell(r, ctx): <td>...</td> 全体を返す。ctx = { depth, detailId }。
//  - sortKey があれば単一キーソート列(<th> にソートクラス/データ属性を付与)。
//    複合ソート列(属性/種族・名前/ID・+HP/+BP)は header() 内で個別に矢印を描く。
//  - flex:true の列(特性/効果)は <col> に幅を指定せず残り幅を吸収する。

const tdBase = 'px-3 py-2 border-b border-gray-700';

function sortArrow(key) {
  return state.sortKey === key ? (state.sortDir === 1 ? ' ▲' : ' ▼') : '';
}
function sarr(s) {
  return s ? '<span style="color:#818cf8;font-size:0.65em">' + s + '</span>' : '';
}
// 複合ヘッダの 1 キー分(ラベル + 矢印 + data-sort)。
function sortSpan(label, key) {
  return '<span class="cursor-pointer hover:text-indigo-300" data-sort="' + key + '">' + label + sarr(sortArrow(key)) + '</span>';
}
function sep() {
  return '<span class="text-gray-600 select-none">/</span>';
}

function nameBadges(r) {
  const fusionTip   = r.fusion_html ? ' class="fusion-badge kw" data-tip="' + esc(r.fusion_html) + '"' : ' class="fusion-badge"';
  const fusionBadge = r.from_fusion ? ' <span' + fusionTip + '>合体</span>' : '';
  const glyphBadge  = (!r.in_dex && r.is_glyph) ? ' <span class="fusion-badge" style="background:#7c3aed">グリフ</span>' : '';
  const spawnTip    = r.spawn_html ? ' class="fusion-badge kw" data-tip="' + esc(r.spawn_html) + '" style="background:#0e7490"' : ' class="fusion-badge" style="background:#0e7490"';
  const spawnBadge  = ((!r.in_dex && r.is_spawnable && !r.is_glyph) || (r.in_dex && r.has_spawn_sources)) ? ' <span' + spawnTip + '>生成</span>' : '';
  const noDeckBadge = (!r.in_dex && (r.is_spawnable || r.from_fusion || r.is_glyph)) ? ' <span class="fusion-badge" style="background:#b45309">デッキ外</span>' : '';
  const npcBadge    = (!r.in_dex && !r.is_spawnable && !r.from_fusion && !r.is_glyph) ? ' <span class="fusion-badge" style="background:#6b7280">NPC</span>' : '';
  return fusionBadge + glyphBadge + spawnBadge + noDeckBadge + npcBadge;
}

const COLUMNS = {
  img: {
    label: '画像', defaultWidth: 72, align: 'text-center',
    header: () => '画像',
    cell: (r, ctx) => {
      const depth = ctx.depth || 0;
      // depth > 0 (参照先として展開された行) は、画像セルに左アクセントと
      // 段数に応じたインデントを付けて、上のカードとのつながりを示す。
      const style = depth > 0 ? 'border-left:3px solid #6366f1;padding-left:' + (10 + (depth - 1) * 14) + 'px' : '';
      const styleAttr = style ? ' style="' + style + '"' : '';
      const thumbBorder = state.ELEMENT_COLOR[r.attr] || '#4b5563';
      return '<td class="' + tdBase + ' text-center img-cell"' + styleAttr + ' title="クリックでデッキに追加">' +
        '<img src="' + esc(r.img_url) + '" alt="" class="card-thumb" style="border-color:' + esc(thumbBorder) + '" loading="lazy" onerror="this.style.display=\'none\'"></td>';
    },
  },
  attrClass: {
    label: '属性/種族', defaultWidth: 96, align: 'text-center',
    header: () => sortSpan('属性', 'attr_ja') + sep() + sortSpan('種族', 'class'),
    cell: (r) => {
      const tribeData = r.class ? ' data-tribe="' + esc(r.class) + '"' : '';
      const tribeCls = 'text-gray-400 text-xs mt-1' + (r.class ? ' cursor-pointer hover:underline block w-fit mx-auto' : '');
      return '<td class="' + tdBase + ' whitespace-nowrap text-center">' +
        attrBadge(r.attr) +
        '<div class="' + tribeCls + '"' + tribeData + '>' + (esc(r.class_ja || r.class) || '') + '</div></td>';
    },
  },
  type: {
    label: 'タイプ', defaultWidth: 68, sortKey: 'card_type',
    header: () => 'タイプ',
    cell: (r) => '<td class="' + tdBase + '">' + typeBadge(r.card_type) + '</td>',
  },
  lv: {
    label: 'Lv', defaultWidth: 40, align: 'text-center', sortKey: 'lv',
    header: () => 'Lv',
    cell: (r) => {
      const lv = r.lv !== '' && r.lv != null
        ? '<span class="font-bold text-indigo-400">' + esc(r.lv === 0 ? '?' : r.lv) + '</span>'
        : '<span class="text-gray-600">-</span>';
      return '<td class="' + tdBase + ' text-center">' + lv + '</td>';
    },
  },
  nameId: {
    label: '名前/ID', defaultWidth: 168,
    header: () => sortSpan('名前', 'name') + sep() + sortSpan('ID', 'name_en'),
    cell: (r, ctx) => {
      const depth = ctx.depth || 0;
      const connectMark = depth > 0 ? '<span class="text-indigo-400 mr-1" title="参照元カードから展開">↳</span>' : '';
      return '<td class="' + tdBase + ' whitespace-nowrap">' +
        '<div class="font-semibold text-gray-100">' + connectMark + '<span class="card-name">' + highlight(r.name, state.lastQ) + '</span>' + nameBadges(r) + '</div>' +
        '<div class="text-gray-500 text-xs cursor-pointer hover:underline inline-block" data-detail-toggle="' + ctx.detailId + '" title="クリックでJSON表示">' + highlight(r.name_en, state.lastQ) + '</div>' +
        '</td>';
    },
  },
  cost: {
    label: 'コスト', defaultWidth: 132, sortKey: 'cost',
    header: () => 'コスト',
    cell: (r) => '<td class="' + tdBase + ' whitespace-nowrap">' + highlightHtml(fmtCost(r), state.lastQ) + '</td>',
  },
  hp: {
    label: 'HP', defaultWidth: 44, align: 'text-center', sortKey: 'hp',
    header: () => 'HP',
    cell: (r) => '<td class="' + tdBase + ' text-center font-mono text-gray-200">' + (r.hp !== '' ? esc(r.hp) : '-') + '</td>',
  },
  bp: {
    label: 'BP', defaultWidth: 44, align: 'text-center', sortKey: 'bp',
    header: () => 'BP',
    cell: (r) => '<td class="' + tdBase + ' text-center font-mono text-gray-200">' + (r.bp !== '' ? esc(r.bp) : '-') + '</td>',
  },
  bonus: {
    label: '+HP/+BP', defaultWidth: 72, align: 'text-center',
    header: () => sortSpan('+HP', 'bonus_hp') + sep() + sortSpan('+BP', 'bonus_bp'),
    cell: (r) => '<td class="' + tdBase + ' text-center">' + fmtBonus(r) + '</td>',
  },
  effect: {
    label: '特性/効果', defaultWidth: 300,
    header: () => '特性/効果',
    cell: (r) => {
      const eff = fmtEffect(r);
      const flagsHtml = fmtFlags(r);
      const inner = (flagsHtml && eff)
        ? '<div class="effect-text">' + highlightHtml(eff, state.lastQ) + '</div><div class="effect-text" style="margin-top:4px;border-top:1px solid #374151;padding-top:4px">' + highlightHtml(flagsHtml, state.lastQ) + '</div>'
        : '<div class="effect-text">' + highlightHtml(flagsHtml || eff, state.lastQ) + '</div>';
      return '<td class="' + tdBase + ' effect-cell text-gray-300">' + inner + '</td>';
    },
  },
};

// 1枚のカード行(本体行 + JSON詳細行)のHTMLを返す。
// 通常の検索結果一覧と、カード名クリックで展開する参照先カード行の両方で共用する。
export function buildRowHtml(r, opts) {
  const order = opts.order || activeOrder();
  const depth = opts.depth || 0;
  const ctx = { depth, detailId: opts.detailId };
  let cols = '';
  order.forEach(key => { cols += COLUMNS[key].cell(r, ctx); });

  const rawJson = r.raw_json || '(データなし)';
  const rowBg = depth > 0 ? '' : (opts.zebra || 'bg-gray-900');
  const rowStyle = depth > 0 ? ' style="background:rgba(99,102,241,0.07)"' : '';
  return (
    '<tr class="' + rowBg + '" data-depth="' + depth + '" data-card-id="' + esc(r.name_en) + '" data-addable="' + (r.in_dex ? '1' : '0') + '"' + rowStyle + '>' + cols + '</tr>' +
    '<tr id="' + opts.detailId + '" class="json-detail bg-gray-950" style="display:none"><td colspan="' + order.length + '" class="px-4 py-2 border-b border-gray-700"><pre>' + highlight(rawJson, state.lastQ) + '</pre></td></tr>'
  );
}

// 列の採用幅(px)。ユーザー保存幅 > 既定幅。全列が固定幅(特性/効果も含む)。
function electedWidth(key) {
  return layout.columnWidths[key] || COLUMNS[key].defaultWidth;
}

// <colgroup>: 全列に明示幅を与える(table-layout:fixed と組み合わせてリサイズを効かせる)。
function buildColgroup(order) {
  let h = '<colgroup>';
  order.forEach(key => {
    h += '<col data-col="' + key + '" style="width:' + electedWidth(key) + 'px">';
  });
  return h + '</colgroup>';
}

// テーブル全体の幅 = 全列の採用幅の合計。全列固定幅なので、列を縮めれば総幅も縮み
// (横スクロールが減り)、広げれば総幅が増える、という直感的な挙動になる。
function tableTotalWidth(order) {
  return order.reduce((sum, key) => sum + electedWidth(key), 0);
}

const thBase = 'px-3 pb-2 border-b border-gray-700 bg-gray-800 font-semibold text-gray-300 whitespace-nowrap text-left sticky top-0 z-10';

function buildTh(key) {
  const col = COLUMNS[key];
  const alignCls = col.align ? ' ' + col.align : '';
  let sortCls = '', sortAttr = '';
  if (col.sortKey) {
    sortCls = state.sortKey === col.sortKey ? (state.sortDir === 1 ? ' sort-asc' : ' sort-desc') : '';
    sortAttr = ' data-sort="' + col.sortKey + '"';
  }
  const handle = '<span class="col-drag" draggable="true" data-col="' + key + '" title="ドラッグで列を移動">⠿</span>';
  const resize = '<span class="col-resize" data-col="' + key + '"></span>';
  return '<th class="col-th ' + thBase + alignCls + sortCls + '" data-col="' + key + '" style="padding-top:1.5rem"' + sortAttr + '>' +
    handle + col.header() + resize + '</th>';
}

// グリッド(カード)表示。カード画像を敷き詰め、ホバーで既存の詳細ツールチップ(.kw)を出す。
// クリック追加は deck.js の table-wrap ハンドラ(.grid-card 分岐)が処理する。
function renderGrid(rows, wrap) {
  const sorted = sortRows(rows);
  let html = '<div class="card-grid">';
  sorted.forEach(r => {
    const tip = esc(deckCardDetailHtml(r));
    const thumbBorder = state.ELEMENT_COLOR[r.attr] || '#4b5563';
    html += '<div class="grid-card kw" data-card-id="' + esc(r.name_en) + '" data-addable="' + (r.in_dex ? '1' : '0') + '" data-tip="' + tip + '" title="クリックでデッキに追加">' +
      '<img src="' + esc(r.img_url) + '" alt="" class="grid-thumb" style="border-color:' + esc(thumbBorder) + '" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
      '<div class="grid-card-name">' + highlight(r.name, state.lastQ) + nameBadges(r) + '</div>' +
      '</div>';
  });
  html += '</div>';
  wrap.innerHTML = html;
}

export function renderTable(rows) {
  state.lastRows = rows;
  const wrap = document.getElementById('table-wrap');
  if (!rows.length) {
    wrap.innerHTML = '<p class="text-gray-500 mt-16 text-center text-base">該当するカードがありません</p>';
    return;
  }

  if (layout.viewMode === 'grid') { renderGrid(rows, wrap); return; }

  const order = activeOrder();
  const sorted = sortRows(rows);

  let html = '<table class="border-collapse text-xs bg-gray-900" style="table-layout:fixed;width:' + tableTotalWidth(order) + 'px">';
  html += buildColgroup(order);
  html += '<thead><tr>';
  order.forEach(key => { html += buildTh(key); });
  html += '</tr></thead><tbody>';

  sorted.forEach((r, i) => {
    const zebra = i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800';
    html += buildRowHtml(r, { detailId: 'detail-' + i, depth: 0, zebra, order });
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;

  // 各本体行に、直後のJSON詳細行への参照を持たせておく
  // (カード名クリックでの参照先行挿入時に、行の末尾を正しく判定するために使う)。
  wrap.querySelectorAll('tbody > tr[data-depth]').forEach(tr => {
    const next = tr.nextElementSibling;
    if (next && next.classList.contains('json-detail')) tr._detailRow = next;
  });

  wireColumnHandles(wrap);
}

// 列ヘッダの D&D 並べ替えと、列境界ドラッグによる幅リサイズを配線する。
// renderTable のたびに <thead> を作り直すため毎回呼ぶ。
function wireColumnHandles(wrap) {
  // ---- D&D 並べ替え(ハンドル起点) ----
  // ドラッグ中は、挿入先に青い縦線を出して落下位置を示す。各列ヘッダを左右半分に分け、
  // 左半分なら「この列の前」、右半分なら「この列の後」に挿入する(= 右半分をやや広めに
  // 判定して早めに「後」へ切り替わるよう、しきい値を中央よりわずかに左へ寄せる)。
  // これにより最後尾の列の右半分をホバーするだけで末尾へドロップできる。
  let dragKey = null;
  let dropInfo = null; // { key, after }
  const AFTER_THRESHOLD = 0.4; // 列幅に対する比率。中央(0.5)より左に寄せて「後」を早めに判定。
  const clearDrop = () => wrap.querySelectorAll('th.drop-before, th.drop-after')
    .forEach(t => t.classList.remove('drop-before', 'drop-after'));
  const showDrop = (th, after) => { clearDrop(); th.classList.add(after ? 'drop-after' : 'drop-before'); };

  wrap.querySelectorAll('.col-drag').forEach(h => {
    h.addEventListener('dragstart', e => {
      dragKey = h.dataset.col;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragKey); // Firefox はデータ必須
      // 開始直後はまだ移動していないので、元の位置に挿入線を出す(動かさず離せば不変)。
      const selfTh = wrap.querySelector('th.col-th[data-col="' + dragKey + '"]');
      if (selfTh) showDrop(selfTh, false);
      dropInfo = { key: dragKey, after: false };
    });
    h.addEventListener('dragend', () => { dragKey = null; dropInfo = null; clearDrop(); });
  });
  wrap.querySelectorAll('th.col-th').forEach(th => {
    th.addEventListener('dragover', e => {
      if (!dragKey) return;
      e.preventDefault();
      const key = th.dataset.col;
      if (key === dragKey) {
        // 自分自身の上 = 未移動の状態。元の位置のまま表示する。
        showDrop(th, false);
        dropInfo = { key, after: false };
        return;
      }
      const r = th.getBoundingClientRect();
      const after = (e.clientX - r.left) > r.width * AFTER_THRESHOLD;
      showDrop(th, after);
      dropInfo = { key, after };
    });
    th.addEventListener('drop', e => {
      e.preventDefault();
      clearDrop();
      if (!dragKey || !dropInfo || dropInfo.key === dragKey) { dragKey = null; dropInfo = null; return; }
      moveColumn(dragKey, dropInfo.key, dropInfo.after);
      dragKey = null;
      dropInfo = null;
      renderTable(state.lastRows);
      updateLayoutResetButton();
    });
  });

  // ---- 列幅リサイズ(境界ハンドル) ----
  // 列幅を変えるたびにテーブル総幅(= 列幅合計)も更新するので、縮めれば総幅が縮み
  // 横スクロールが減る、という直感的な挙動になる。
  const tbl = wrap.querySelector('table');
  wrap.querySelectorAll('.col-resize').forEach(rz => {
    rz.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation(); // ヘッダのソートクリックと競合させない
      const key = rz.dataset.col;
      const colEl = wrap.querySelector('col[data-col="' + key + '"]');
      if (!colEl) return;
      const startX = e.clientX;
      const startW = colEl.getBoundingClientRect().width;
      document.body.style.cursor = 'col-resize';
      const onMove = ev => {
        const w = Math.max(48, Math.round(startW + (ev.clientX - startX)));
        colEl.style.width = w + 'px';
        layout.columnWidths[key] = w;
        if (tbl) tbl.style.width = tableTotalWidth(activeOrder()) + 'px';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        updateLayoutResetButton();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}
