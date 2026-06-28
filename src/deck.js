// デッキ編集(追加/削除/読込/書出)・タマDNAピッカー・デッキカードから検索結果へのフォーカス。
import { state } from './state.js';
import { TYPE_LABELS, TRIBE_TEXT_COLOR } from './constants.js';
import { esc } from './utils.js';
import { deckToast } from './toast.js';
import { setType, setLv, effectiveAttrs, updateAttrHighlight, updateTribeHighlight, doSearch, SEARCH_FIELD_FN, TARGET_IDS } from './filters.js';

export const DECK_MAX = 60, DECK_MIN = 40, CARD_COPY_MAX = 4;
const DECK_KEY = 'deck-editor-current';
const DECK_PANE_KEY = 'deck-pane-collapsed';
// タマDNA = ゲーム内で選択可能なガーディアン (SpeciesLibrary.Dex の27種)
const DEX_SPECIES = ['Saplee','Vixee','Froxic','Kobou','Talfou','Fifou','Gira','Toxee','DarkSaplee','Cardee','Neiree','Vixel','Frocket','Kobalth','Talisfir','Zephyris','Geardra','Toxica','DarkNeiree','Turtorix','Rott','Anurot','Unary','Bunary','Shovulf','Plowulf','Prisman'];
const DEX_SET = new Set(DEX_SPECIES);
const DECK_TYPE_ORDER = ['tama','appli','patch','virus'];
const DECK_TYPE_LABEL = { tama:'タマ', appli:'アプリ', patch:'パッチ', virus:'ウイルス' };

export let deck = { name: '', guardian: 'None', cards: {}, restrict: true };

export function loadDeck() {
  try {
    const d = JSON.parse(localStorage.getItem(DECK_KEY) || 'null');
    if (d && typeof d === 'object') {
      deck = { name: d.name || '', guardian: d.guardian || 'None', cards: (d.cards && typeof d.cards === 'object') ? d.cards : {}, restrict: d.restrict !== false };
    }
  } catch (e) {}
}
function saveDeck() { localStorage.setItem(DECK_KEY, JSON.stringify(deck)); }
function deckTotal() { return Object.values(deck.cards).reduce((a, b) => a + b, 0); }

export function deckAdd(id) {
  if (!state.CARD_INDEX[id]) return;
  if (deck.restrict && !state.CARD_INDEX[id].in_dex) { deckToast('デッキに入れられないカードです'); return; }
  if (deckTotal() >= DECK_MAX) { deckToast('デッキは最大 ' + DECK_MAX + ' 枚までです'); return; }
  const cur = deck.cards[id] || 0;
  if (cur >= CARD_COPY_MAX) { deckToast('同じカードは ' + CARD_COPY_MAX + ' 枚までです'); return; }
  deck.cards[id] = cur + 1;
  saveDeck();
  renderDeck();
}
export function deckRemove(id) {
  if (!deck.cards[id]) return;
  deck.cards[id]--;
  if (deck.cards[id] <= 0) delete deck.cards[id];
  saveDeck();
  renderDeck();
}

// カード種別 → 属性順 → HP降順 → 名前 で並べる (ゲームの並び替えに準拠)
function deckSortCmp(a, b) {
  const ea = state.CARD_INDEX[a] || {}, eb = state.CARD_INDEX[b] || {};
  let ia = state.ELEMENT_ORDER.indexOf(ea.attr), ib = state.ELEMENT_ORDER.indexOf(eb.attr);
  if (ia < 0) ia = 999; if (ib < 0) ib = 999;
  if (ia !== ib) return ia - ib;
  const ha = Number(ea.hp) || 0, hb = Number(eb.hp) || 0;
  if (ha !== hb) return hb - ha;
  return String(ea.name || a).localeCompare(String(eb.name || b), 'ja');
}

export function deckCardDetailHtml(r) {
  const cls = r.class_ja || r.class;
  // 左: 基本情報
  let basic = '<div class="deck-tip-name"><span class="card-name">' + esc(r.name) + '</span>' +
    ' <span class="card-id" style="color:#94a3b8;font-weight:normal">' + esc(r.name_en) + '</span></div>';
  const attrColor = state.ELEMENT_COLOR[r.attr];
  const attrSpan = '<span class="filt" data-attr="' + esc(r.attr) + '"' +
    (attrColor ? ' style="color:' + attrColor + '"' : '') + '>' + esc(state.ELEMENT_JA[r.attr] || r.attr) + '</span>';
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
  const e = state.CARD_INDEX[id];
  const n = deck.cards[id];
  const tip = esc(deckCardDetailHtml(e));
  const thumbBorder = state.ELEMENT_COLOR[e.attr] || '#4b5563';
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
    label.textContent = 'タマDNA: ' + (state.SPECIES_NAME[deck.guardian] || deck.guardian);
  } else {
    icon.classList.add('hidden');
    label.textContent = 'タマDNA: 未選択';
  }
}

export function syncTableRestrictClass() {
  document.getElementById('table-wrap').classList.toggle('restrict-on', !!deck.restrict);
}

export function renderDeck() {
  syncTableRestrictClass();
  const total = deckTotal();
  const badge = document.getElementById('deck-total-badge');
  badge.textContent = total + ' / ' + DECK_MAX;
  badge.classList.toggle('bg-amber-700', total > 0 && total < DECK_MIN);
  badge.classList.toggle('bg-green-700', total >= DECK_MIN && total <= DECK_MAX);
  badge.classList.toggle('bg-gray-600', total === 0);

  const counts = { tama: 0, appli: 0, patch: 0, virus: 0 };
  Object.entries(deck.cards).forEach(([id, n]) => {
    const e = state.CARD_INDEX[id];
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
    const ids = Object.keys(deck.cards).filter(id => (state.CARD_INDEX[id] || {}).card_type === type);
    if (!ids.length) return;
    ids.sort(deckSortCmp);
    html += '<div class="deck-type-group"><span class="deck-type-label">' + DECK_TYPE_LABEL[type] + '</span>' +
            deckTileHtml(ids[0]) + '</div>';
    ids.slice(1).forEach(id => { html += deckTileHtml(id); });
  });
  grid.innerHTML = html;
}

export function toggleDeckPane() {
  const body = document.getElementById('deck-body');
  const collapse = body.style.display !== 'none';
  body.style.display = collapse ? 'none' : '';
  document.getElementById('deck-caret').textContent = collapse ? '▶' : '▼';
  localStorage.setItem(DECK_PANE_KEY, collapse ? '1' : '0');
}
export function applyDeckPaneState() {
  const collapsed = localStorage.getItem(DECK_PANE_KEY) === '1';
  document.getElementById('deck-body').style.display = collapsed ? 'none' : '';
  document.getElementById('deck-caret').textContent = collapsed ? '▶' : '▼';
}

export function editDeckName() {
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

export function clearDeck() {
  if (deckTotal() === 0) return;
  if (!confirm('デッキのカードを全てクリアします。よろしいですか？')) return;
  deck.cards = {};
  saveDeck();
  renderDeck();
}

function tamaName(s) { return state.SPECIES_NAME[s] || s; }

function showTamaDesc(s) {
  const nameEl = document.getElementById('tama-desc-name');
  const textEl = document.getElementById('tama-desc-text');
  if (!s || s === 'None') {
    nameEl.textContent = '未選択';
    textEl.innerHTML = '<span class="text-gray-500">タマDNAを設定しません。</span>';
    return;
  }
  nameEl.textContent = tamaName(s);
  textEl.innerHTML = state.SPECIES_DESC[s] || '<span class="text-gray-500">（特別な開始効果はありません）</span>';
}

export function openTamaPicker() {
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
export function closeTamaPicker() {
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
    let ta = DECK_TYPE_ORDER.indexOf((state.CARD_INDEX[a] || {}).card_type);
    let tb = DECK_TYPE_ORDER.indexOf((state.CARD_INDEX[b] || {}).card_type);
    if (ta < 0) ta = 9; if (tb < 0) tb = 9;
    if (ta !== tb) return ta - tb;
    return deckSortCmp(a, b);
  });
  return ids.map(id => ({ Id: id, Count: deck.cards[id] }));
}
export function exportDeck() {
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

export function importDeck() { document.getElementById('deck-file-input').click(); }
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
    if (!id || id === 'None' || id === 'Blank' || !state.CARD_INDEX[id]) { missing++; return; }
    cnt = Math.min(cnt, CARD_COPY_MAX);
    if (total + cnt > DECK_MAX) { cnt = Math.max(0, DECK_MAX - total); clamped = true; }
    if (cnt <= 0) return;
    cards[id] = (cards[id] || 0) + cnt;
    total += cnt;
  });
  let guardian = 'None';
  if (data.Guardian && DEX_SET.has(data.Guardian)) guardian = data.Guardian;
  const hasOutOfDeckCard = Object.keys(cards).some(id => !(state.CARD_INDEX[id] || {}).in_dex);
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

// ==================== デッキカード→検索結果フォーカス ====================
// 現在のフィルタが entry を除外している条件だけを「指定なし」に緩める。
function relaxFiltersFor(e) {
  if (state.currentType !== 'all' && e.card_type !== state.currentType) setType('all', true);
  if (state.currentLv && String(e.lv) !== state.currentLv) setLv('', true);
  if (state.selectedAttrs.size && !effectiveAttrs().has(e.attr)) { state.selectedAttrs.clear(); updateAttrHighlight(); }
  if (state.selectedTribes.size && !state.selectedTribes.has(e.class)) { state.selectedTribes.clear(); updateTribeHighlight(); }
  const isNpc = !e.in_dex && !e.is_spawnable;
  if (e.in_dex && !document.getElementById('show-dex').checked) document.getElementById('show-dex').checked = true;
  if (e.is_spawnable && !document.getElementById('show-spawn').checked) document.getElementById('show-spawn').checked = true;
  if (isNpc && !document.getElementById('show-npc').checked) document.getElementById('show-npc').checked = true;
  const q = document.getElementById('q').value.trim();
  if (q) {
    const targets = TARGET_IDS.filter(t => document.getElementById('target-' + t).checked);
    const ql = q.toLowerCase();
    const match = targets.some(t => SEARCH_FIELD_FN[t] && SEARCH_FIELD_FN[t](e).toLowerCase().includes(ql));
    if (!match) document.getElementById('q').value = '';
  }
}

function scrollAndFlashRow(row) {
  row.scrollIntoView({ block: 'center', behavior: 'auto' });
  row.classList.remove('row-flash');
  void row.offsetWidth;  // アニメーション再起動のためリフロー
  row.classList.add('row-flash');
  setTimeout(() => row.classList.remove('row-flash'), 1000);
}

export function focusCardInResults(id) {
  const e = state.CARD_INDEX[id];
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

// init() から呼ばれる、デッキ編集関連のイベント登録。
export function wireDeckEvents() {
  const $ = id => document.getElementById(id);
  // デッキ内カードクリックで1枚削除 / Shift+クリックで1枚追加
  $('deck-grid').addEventListener('click', e => {
    const tile = e.target.closest('.deck-card');
    if (!tile) return;
    if (e.shiftKey) deckAdd(tile.dataset.cardId);
    else deckRemove(tile.dataset.cardId);
  });
  // デッキ内カードを右クリック → 検索結果でそのカードを中央にフォーカス
  $('deck-grid').addEventListener('contextmenu', e => {
    const tile = e.target.closest('.deck-card');
    if (!tile) return;
    e.preventDefault();
    focusCardInResults(tile.dataset.cardId);
  });
  // タマDNAピッカー選択
  $('tama-grid').addEventListener('click', e => {
    const pick = e.target.closest('.tama-pick');
    if (pick) selectGuardian(pick.dataset.species);
  });
  // タマDNAピッカー: ホバー中の種族の説明を下部パネルに表示
  $('tama-grid').addEventListener('mouseover', e => {
    const pick = e.target.closest('.tama-pick');
    if (pick) showTamaDesc(pick.dataset.species);
  });
  $('deck-file-input').addEventListener('change', onDeckFile);
  // 検索結果のデッキ追加クリック。リスト/グリッド両表示に対応する。
  $('table-wrap').addEventListener('click', e => {
    // グリッド表示: カードタイル(.grid-card)はタイル自体が .kw(ホバー詳細)のため、
    //   .kw 除外より先に専用分岐で追加する。タイル内の絞り込みリンクのみ除外。
    const tile = e.target.closest('.grid-card');
    if (tile) {
      if (e.target.closest('.cardref, [data-attr], [data-tribe], [data-set-type]')) return;
      deckAdd(tile.dataset.cardId);
      return;
    }
    // リスト表示: 画像セル(パディング含む)のクリックでのみ1枚追加 (既存のクリック要素は除外)。
    // 画像列は並べ替えで先頭とは限らないため、位置ではなく .img-cell で判定する。
    if (e.target.closest('.kw, .cardref, [data-attr], [data-tribe], [data-detail-toggle], [data-set-type], [data-sort]')) return;
    if (!e.target.closest('.img-cell')) return;
    const tr = e.target.closest('tr[data-card-id]');
    if (tr) deckAdd(tr.dataset.cardId);
  });
  $('tama-btn').addEventListener('click', openTamaPicker);
  $('deck-name').addEventListener('click', editDeckName);
  $('deck-restrict-flag').addEventListener('change', function () {
    deck.restrict = this.checked; saveDeck(); syncTableRestrictClass();
  });
  $('deck-import').addEventListener('click', importDeck);
  $('deck-export').addEventListener('click', exportDeck);
  $('deck-clear').addEventListener('click', clearDeck);
  $('deck-toggle-bar').addEventListener('click', toggleDeckPane);
  // タマDNA選択モーダル(背景クリックで閉じる)
  const tamaModal = $('tama-modal');
  tamaModal.addEventListener('click', e => { if (e.target === tamaModal) closeTamaPicker(); });
  $('tama-close').addEventListener('click', closeTamaPicker);
}
