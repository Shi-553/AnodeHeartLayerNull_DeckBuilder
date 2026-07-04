// サイドバーのフィルタ(タイプ/レベル/属性/種族/検索対象/カード範囲)の状態管理・検索実行・
// 既定値(保存/戻す)管理。
import { state } from './state.js';
import { DARK_MAP, ATTR_COLORS, ALL_CARD_TYPES, TRIBE_EMOJI } from './constants.js';
import { renderTable, nameBadgeSearchText } from './table.js';
import { deckToast } from './toast.js';
import { stripHtml } from './utils.js';

export const TYPES = ['all', 'tama', 'appli', 'virus', 'patch'];

export function setType(t, silent) {
  state.currentType = t;
  if (t !== 'tama') { state.currentLv = ''; }
  const active   = 'py-1 rounded text-xs font-bold transition bg-indigo-600 text-white';
  const inactive = 'py-1 rounded text-xs font-bold transition bg-gray-600 text-gray-300';
  TYPES.forEach(k => {
    document.getElementById('btn-' + k).className = k === t ? active : inactive;
  });
  document.getElementById('lv-section').style.display = t === 'tama' ? '' : 'none';
  if (!silent) doSearch();
}

export function setLv(v, silent) {
  state.currentLv = v;
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
  const ja = state.ELEMENT_JA[a] || a;
  const el = document.createElement('div');
  el.id = 'attr-row-' + a;
  el.className = 'flex-1 min-w-0 flex items-center gap-2 px-2 py-1 rounded cursor-pointer select-none hover:bg-gray-600';
  el.innerHTML = '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + color + ' truncate">' + ja + '</span>';
  el.addEventListener('click', e => onAttrClick(a, e));
  return el;
}

export function buildAttrList() {
  const wrap = document.getElementById('attr-list');
  const attrSet = new Set(state.ATTRS);
  const pairedDark = new Set();
  Object.entries(DARK_MAP).forEach(([light, dark]) => {
    if (attrSet.has(light) && attrSet.has(dark)) pairedDark.add(dark);
  });
  state.ATTRS.forEach(a => {
    if (pairedDark.has(a)) return; // 対応する闇属性の行で一緒に描画される
    const row = document.createElement('div');
    row.className = 'flex gap-1.5';
    row.appendChild(makeAttrCell(a));
    const dark = DARK_MAP[a];
    if (dark && attrSet.has(dark)) row.appendChild(makeAttrCell(dark));
    wrap.appendChild(row);
  });
}

export function buildTribeList() {
  const wrap = document.getElementById('tribe-list');
  // カードが多い種族ほど使う機会が多いため、先頭に並べる。
  const counts = {};
  state.ALL_CARDS.forEach(e => { if (e.class) counts[e.class] = (counts[e.class] || 0) + 1; });
  const sorted = [...state.TRIBES].sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
  sorted.forEach(t => {
    const el = document.createElement('div');
    el.id = 'tribe-row-' + t;
    el.dataset.tribe = t;
    el.className = 'shrink-0 whitespace-nowrap px-2 py-1 rounded-full text-xs text-gray-200 bg-gray-600 cursor-pointer select-none hover:bg-gray-500';
    const emoji = TRIBE_EMOJI[t] ? TRIBE_EMOJI[t] + ' ' : '';
    el.textContent = emoji + (state.TRIBES_JA[t] || t);
    // クリックは wireFilterEvents() のドキュメント委譲([data-tribe])が処理する。
    // ここで個別にも bind すると1クリックで onTribeClick が2回呼ばれ、トグルが相殺されてしまう。
    wrap.appendChild(el);
  });
}

export function onAttrClick(a, e) {
  if (!e.ctrlKey && !e.metaKey) {
    if (state.selectedAttrs.size === 1 && state.selectedAttrs.has(a)) {
      state.selectedAttrs.clear();
    } else {
      state.selectedAttrs.clear();
      state.selectedAttrs.add(a);
    }
  } else {
    if (state.selectedAttrs.has(a)) state.selectedAttrs.delete(a);
    else state.selectedAttrs.add(a);
  }
  updateAttrHighlight();
  doSearch();
}

export function effectiveAttrs() {
  const set = new Set(state.selectedAttrs);
  if (document.getElementById('include-dark').checked) {
    state.selectedAttrs.forEach(a => { const d = DARK_MAP[a]; if (d) set.add(d); });
  }
  return set;
}

export function updateAttrHighlight() {
  const highlightSet = effectiveAttrs();
  state.ATTRS.forEach(a => {
    const el = document.getElementById('attr-row-' + a);
    if (!el) return;
    el.style.backgroundColor = highlightSet.has(a) ? '#312e81' : '';
  });
}

export function onTribeClick(t, e) {
  if (!e.ctrlKey && !e.metaKey) {
    if (state.selectedTribes.size === 1 && state.selectedTribes.has(t)) {
      state.selectedTribes.clear();
    } else {
      state.selectedTribes.clear();
      state.selectedTribes.add(t);
    }
  } else {
    if (state.selectedTribes.has(t)) state.selectedTribes.delete(t);
    else state.selectedTribes.add(t);
  }
  updateTribeHighlight();
  doSearch();
}

export function updateTribeHighlight() {
  state.TRIBES.forEach(t => {
    const el = document.getElementById('tribe-row-' + t);
    if (!el) return;
    el.style.backgroundColor = state.selectedTribes.has(t) ? '#312e81' : '';
  });
}

// SEARCH_FIELDS(scripts/site_data.py)と同じ検索対象テキストを返す。
export const SEARCH_FIELD_FN = {
  name:   e => e.name || '',
  id:     e => e.name_en || '',
  cost:   e => stripHtml(e.cost_ja),
  effect: e => stripHtml(e.effect_ja) + stripHtml(e.flags_ja),
  badge:  e => nameBadgeSearchText(e),
  json:   e => e.raw_json || '',
};

// scripts/site_data.py の search_cards() と同一のフィルタ条件をクライアントで実行する。
export function doSearch() {
  const q = document.getElementById('q').value.trim();
  const qRegex = document.getElementById('q-regex').checked;
  const showDex   = document.getElementById('show-dex').checked;
  const showSpawn = document.getElementById('show-spawn').checked;
  const showNpc   = document.getElementById('show-npc').checked;
  const targets = TARGET_IDS.filter(t => document.getElementById('target-' + t).checked);
  const attrSet = effectiveAttrs();
  const qLower = q.toLowerCase();
  let qRe = null;
  let regexError = false;
  if (q && qRegex) {
    try {
      qRe = new RegExp(q, 'i');
    } catch (e) {
      regexError = true;
    }
  }

  const results = state.ALL_CARDS.filter(e => {
    if (state.currentType === 'all') {
      if (!ALL_CARD_TYPES.includes(e.card_type)) return false;
    } else if (e.card_type !== state.currentType) {
      return false;
    }
    if (attrSet.size && !attrSet.has(e.attr)) return false;
    const isOutOfDeck = !e.in_dex && (e.is_spawnable || e.from_fusion || e.is_glyph || e.is_shop);
    const isNpc = !e.in_dex && !isOutOfDeck;
    if (!showDex && e.in_dex) return false;
    if (!showSpawn && isOutOfDeck) return false;
    if (!showNpc && isNpc) return false;
    if (state.currentLv && String(e.lv) !== state.currentLv) return false;
    if (state.selectedTribes.size && !state.selectedTribes.has(e.class)) return false;
    if (q) {
      if (regexError) return false;
      if (qRe) {
        if (!targets.some(t => SEARCH_FIELD_FN[t] && qRe.test(SEARCH_FIELD_FN[t](e)))) return false;
      } else {
        if (!targets.some(t => SEARCH_FIELD_FN[t] && SEARCH_FIELD_FN[t](e).toLowerCase().includes(qLower))) return false;
      }
    }
    return true;
  });

  state.lastQ = q;
  state.lastQRegex = !!(q && qRegex && !regexError);
  document.getElementById('count-badge').textContent = results.length + ' 件' + (regexError ? ' (正規表現エラー)' : '');
  renderTable(results);
  updateFilterResetButtons();
}

// ==================== フィルタの既定値管理 ====================
const FILTER_DEFAULTS_KEY = 'filter-defaults-v2';
export const FILTER_SECTIONS = ['type', 'q', 'targets', 'lv', 'attrs', 'tribes', 'range'];
export const TARGET_IDS = ['name', 'id', 'cost', 'effect', 'badge', 'json'];
const BUILTIN_FILTER_DEFAULTS = {
  type: 'all', q: { text: '', regex: false }, targets: TARGET_IDS.filter(t => t !== 'json'), lv: '',
  attrs: { list: [], dark: true }, tribes: [],
  range: { dex: true, spawn: false, npc: false },
};

export let FILTER_DEFAULTS = (() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(FILTER_DEFAULTS_KEY) || '{}'); } catch (e) { saved = {}; }
  return Object.assign({}, structuredClone(BUILTIN_FILTER_DEFAULTS), saved);
})();

function _normVal(v) {
  return JSON.stringify(v, (k, val) => Array.isArray(val) ? [...val].sort() : val);
}

function readSection(sec) {
  switch (sec) {
    case 'type': return state.currentType;
    case 'q': return {
      text: document.getElementById('q').value,
      regex: document.getElementById('q-regex').checked,
    };
    case 'targets': return TARGET_IDS.filter(t => document.getElementById('target-' + t).checked);
    case 'lv': return state.currentLv;
    case 'attrs': return { list: [...state.selectedAttrs], dark: document.getElementById('include-dark').checked };
    case 'tribes': return [...state.selectedTribes];
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
      document.getElementById('q').value = value.text || '';
      document.getElementById('q-regex').checked = !!value.regex;
      break;
    case 'targets':
      TARGET_IDS.forEach(t => { document.getElementById('target-' + t).checked = value.includes(t); });
      break;
    case 'lv': setLv(value, true); break;
    case 'attrs':
      state.selectedAttrs = new Set(value.list);
      document.getElementById('include-dark').checked = value.dark;
      updateAttrHighlight();
      break;
    case 'tribes':
      state.selectedTribes = new Set(value);
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

export function resetSection(sec) {
  applySection(sec, structuredClone(FILTER_DEFAULTS[sec]), false);
}

export function resetAllFilters() {
  FILTER_SECTIONS.forEach(sec => applySection(sec, structuredClone(FILTER_DEFAULTS[sec]), true));
  doSearch();
}

// init() から呼ばれる、起動時の既定値適用(検索は呼び出し側でまとめて実行する)。
export function applyInitialFilterDefaults() {
  FILTER_SECTIONS.forEach(sec => applySection(sec, structuredClone(FILTER_DEFAULTS[sec]), true));
}

export function saveSectionDefault(sec) {
  FILTER_DEFAULTS[sec] = readSection(sec);
  localStorage.setItem(FILTER_DEFAULTS_KEY, JSON.stringify(FILTER_DEFAULTS));
  updateFilterResetButtons();
  deckToast('「' + (SECTION_LABELS[sec] || sec) + '」を既定値として保存しました', 'info');
}

const SECTION_LABELS = {
  type: 'カードタイプ', q: 'キーワード', targets: '検索対象', lv: 'レベル',
  attrs: '属性', tribes: '種族', range: 'カード範囲',
};

export function updateFilterResetButtons() {
  FILTER_SECTIONS.forEach(sec => {
    const isDef = sectionIsDefault(sec);
    document.querySelectorAll(
      '.sec-reset[data-sec="' + sec + '"], .sec-save[data-sec="' + sec + '"], .header-sec-reset[data-sec="' + sec + '"]'
    ).forEach(btn => { btn.classList.toggle('hidden', isDef); });
  });
}

// ヘッダーに、変更があるセクションだけ一目でわかる個別の「戻す」ボタンを生成する。
// サイドバーの sec-reset と同じ resetSection(sec) を呼ぶ(表示/非表示の制御も共通)。
function buildHeaderSectionResets() {
  const wrap = document.getElementById('header-sec-resets');
  FILTER_SECTIONS.forEach(sec => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'header-sec-reset hidden bg-amber-700 hover:bg-amber-600 px-2.5 py-0.5 rounded-full text-xs font-semibold';
    btn.dataset.sec = sec;
    btn.title = (SECTION_LABELS[sec] || sec) + 'を既定値に戻す';
    btn.textContent = '↺ ' + (SECTION_LABELS[sec] || sec);
    btn.addEventListener('click', () => resetSection(sec));
    wrap.appendChild(btn);
  });
}

// init() / wireFilterEvents() から呼ばれる、フィルタUI関連のイベント登録。
export function wireFilterEvents() {
  const $ = id => document.getElementById(id);
  buildHeaderSectionResets();
  document.querySelectorAll('.sec-reset[data-sec]').forEach(b =>
    b.addEventListener('click', () => resetSection(b.dataset.sec)));
  document.querySelectorAll('.sec-save[data-sec]').forEach(b =>
    b.addEventListener('click', () => saveSectionDefault(b.dataset.sec)));
  TYPES.forEach(t => $('btn-' + t).addEventListener('click', () => setType(t)));
  ['target-name', 'target-id', 'target-cost', 'target-effect', 'target-json',
    'target-badge',
    'show-dex', 'show-spawn', 'show-npc', 'q-regex'].forEach(id =>
    $(id).addEventListener('change', doSearch));
  [['lv-all', ''], ['lv-0', '0'], ['lv-1', '1'], ['lv-2', '2'], ['lv-3', '3'], ['lv-4', '4']]
    .forEach(([id, v]) => $(id).addEventListener('click', () => setLv(v)));
  $('include-dark').addEventListener('change', () => { updateAttrHighlight(); doSearch(); });
  // 動的生成HTML(検索結果テーブル/効果テキスト/デッキ詳細ポップアップ)内の
  // 属性/種族クリックをイベント委譲でまとめて処理する。
  document.addEventListener('click', e => {
    const filt = e.target.closest('[data-attr], [data-tribe]');
    if (!filt) return;
    if (filt.dataset.attr) onAttrClick(filt.dataset.attr, e);
    else onTribeClick(filt.dataset.tribe, e);
  });
}
