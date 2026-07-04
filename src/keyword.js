// キーワード入力欄の履歴管理と、マウス位置の語からのキーワード検索("F"キー)。
import { debounce } from './utils.js';
import { doSearch } from './filters.js';
import { state } from './state.js';

let kwHistory = [];
try { kwHistory = JSON.parse(localStorage.getItem('kw-history') || '[]'); } catch (e) { kwHistory = []; }

function onKwInput() {
  debounce(doSearch);
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

// ==================== なんでもキーワード検索 ====================
let _lastMouse = { x: 0, y: 0 };

// マウス位置の要素から検索キーワードを抽出する(.filt/.kw/.fusion-badge/.cardref/属性・種族バッジ/名前/ID/属性エネルギー句)
const KW_TOKEN_SELECTOR = '.filt, .kw, .fusion-badge, .cardref, .card-name, .card-id, [data-attr], [data-tribe], [data-kw], [data-detail-toggle]';

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
  // 種族バッジ等は絵文字付きの表示テキストを持つため、絵文字なしの元データ(data-tribe等)があれば優先する
  let text;
  if (tok && tok.dataset.tribe) text = state.TRIBES_JA[tok.dataset.tribe] || tok.dataset.tribe;
  else if (tok && tok.dataset.attr) text = state.ELEMENT_JA[tok.dataset.attr] || tok.dataset.attr;
  else if (tok && tok.dataset.kw) text = tok.dataset.kw;
  else text = tok ? tok.textContent : el.textContent;
  text = (text || '').trim();
  // トークンが取れない/長すぎる場合は採用しない(セル全体などの誤検出を避ける)
  if (!tok && text.length > 30) return '';
  return text;
}

function searchKeyword(kw) {
  const input = document.getElementById('q');
  input.value = kw;
  doSearch();
  commitKwHistory();  // 入力欄をフォーカスしないため、blurに頼らず明示的に履歴へ反映する
}

export function keywordSearchAtCursor() {
  // テキスト選択があれば最優先
  const sel = (window.getSelection && window.getSelection().toString() || '').trim();
  let kw = sel;
  if (!kw) {
    const el = document.elementFromPoint(_lastMouse.x, _lastMouse.y);
    kw = keywordFromElement(el);
  }
  if (!kw) return;
  searchKeyword(kw);
}

// init() から呼ばれる、キーワード検索関連のイベント登録。
export function wireKeywordEvents() {
  const $ = id => document.getElementById(id);
  $('q').addEventListener('input', onKwInput);
  $('q').addEventListener('keydown', onKwKeydown);
  $('q').addEventListener('blur', commitKwHistory);
  $('kw-history-btn').addEventListener('click', toggleKwHistory);
  document.addEventListener('click', e => {
    const list = $('kw-history-list');
    const btn  = $('kw-history-btn');
    if (!list.classList.contains('hidden') && !list.contains(e.target) && e.target !== btn) hideKwHistory();
  });
  document.addEventListener('mousemove', e => { _lastMouse.x = e.clientX; _lastMouse.y = e.clientY; }, { passive: true });
  // 「風属性エネルギー」等のフレーズ(data-kw)クリックは属性フィルタではなくキーワード検索を行う。
  document.addEventListener('click', e => {
    const kwEl = e.target.closest('[data-kw]');
    if (kwEl) searchKeyword(kwEl.dataset.kw);
  });
}
