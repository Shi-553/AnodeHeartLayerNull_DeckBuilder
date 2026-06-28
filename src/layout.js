// レイアウト(列順・列幅・ビューモード)の状態と永続化。
// filters.js の既定値管理と同型だが、セクション別に分けず「レイアウト」概念で一括管理する。
// 列キーは table.js の COLUMNS と対応する。
import { state } from './state.js';

const LAYOUT_KEY = 'layout-defaults-v1';

// 型ごとの基準列順(= 列の宇宙)。currentType を tama / all / other の3バケットに射影する。
// 現行表示と同一順(列定義駆動リファクタの回帰の起点)。
export const BASE_ORDER = {
  tama:  ['img', 'attrClass', 'lv', 'nameId', 'cost', 'hp', 'bp', 'bonus', 'effect'],
  all:   ['img', 'attrClass', 'type', 'lv', 'nameId', 'cost', 'hp', 'bp', 'bonus', 'effect'],
  other: ['img', 'attrClass', 'nameId', 'cost', 'effect'],
};

const BUILTIN_LAYOUT_DEFAULTS = {
  columnOrder: structuredClone(BASE_ORDER),  // { tama:[], all:[], other:[] }
  columnWidths: {},                          // { <colKey>: px } 列キー単位で型をまたいで共有
  viewMode: 'list',                          // 'list' | 'grid'(4dで使用)
};

// 保存済み既定値(localStorage)。組み込み既定値に上書きマージ。
export let LAYOUT_DEFAULTS = (() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}'); } catch (e) { saved = {}; }
  return Object.assign(structuredClone(BUILTIN_LAYOUT_DEFAULTS), saved);
})();

// 画面に適用中のライブ状態(既定値のクローンから開始)。
export const layout = {
  columnOrder: structuredClone(LAYOUT_DEFAULTS.columnOrder),
  columnWidths: Object.assign({}, LAYOUT_DEFAULTS.columnWidths),
  viewMode: LAYOUT_DEFAULTS.viewMode,
};

// currentType → 列順バケット名。
export function bucket() {
  return state.currentType === 'tama' ? 'tama'
       : state.currentType === 'all'  ? 'all'
       : 'other';
}

// 現在の型の有効列順。保存値が壊れていても BASE_ORDER で補正する
// (未知キー除去 + 欠落キー末尾追加)。
export function activeOrder() {
  const b = bucket();
  const base = BASE_ORDER[b];
  const saved = layout.columnOrder[b] || [];
  const valid = saved.filter(k => base.includes(k));
  const missing = base.filter(k => !valid.includes(k));
  return [...valid, ...missing];
}

// fromKey を toKey の直前へ移動する。
export function moveColumn(fromKey, toKey) {
  const b = bucket();
  const arr = activeOrder();
  const fi = arr.indexOf(fromKey);
  if (fi < 0) return;
  arr.splice(fi, 1);
  const ti = arr.indexOf(toKey);
  arr.splice(ti < 0 ? arr.length : ti, 0, fromKey);
  layout.columnOrder[b] = arr;
}

function snapshot(src) {
  return JSON.stringify({ o: src.columnOrder, w: src.columnWidths, v: src.viewMode });
}

export function layoutIsDefault() {
  return snapshot(layout) === snapshot(LAYOUT_DEFAULTS);
}

export function saveLayoutDefault() {
  LAYOUT_DEFAULTS = {
    columnOrder: structuredClone(layout.columnOrder),
    columnWidths: Object.assign({}, layout.columnWidths),
    viewMode: layout.viewMode,
  };
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(LAYOUT_DEFAULTS));
}

export function resetLayout() {
  layout.columnOrder = structuredClone(LAYOUT_DEFAULTS.columnOrder);
  layout.columnWidths = Object.assign({}, LAYOUT_DEFAULTS.columnWidths);
  layout.viewMode = LAYOUT_DEFAULTS.viewMode;
}

// ヘッダの「↺ レイアウト」ボタンを、既定と一致する間は隠す(filters の戻すボタンと同方針)。
export function updateLayoutResetButton() {
  const btn = document.getElementById('layout-reset');
  if (btn) btn.classList.toggle('hidden', layoutIsDefault());
}
