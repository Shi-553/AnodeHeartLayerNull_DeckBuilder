// 操作ヘルプモーダルと、グローバルなキーボード操作。
import { esc } from './utils.js';
import { resetAllFilters } from './filters.js';
import { keywordSearchAtCursor } from './keyword.js';
import { closeTamaPicker } from './deck.js';

// UIエリアごとに分類しておくと一覧がぱっと見で把握しやすい。
// 各項目は [操作, 結果, 補足(任意・小さく添える)]。
const OPERATIONS = [
  { group: '検索フィルタ（右パネル）', items: [
    ['Ctrl + 属性・種族をクリック', '複数選択（トグル）'],
  ] },
  { group: '検索結果: リストレイアウト', items: [
    ['カード画像をクリック', 'デッキに1枚追加'],
    ['カードIDをクリック', '内部Jsonを表示'],
    ['参照先カード名をクリック', '参照先カードの表示'],
    ['属性・種族・タイプをクリック', '検索に反映'],
    ['各列名をクリック', '結果をソート'],
    ['各列・列間をドラッグ', '列の入れ替え、幅調整'],
  ] },
  { group: '検索結果: グリッドレイアウト', items: [
    ['カードをクリック', 'デッキに1枚追加'],
    ['カードを右クリック', '詳細をポップアップ'],
    ['詳細->参照先カード名をクリック', '参照先カードの表示'],
  ] },
  { group: 'デッキ（左パネル）', items: [
    ['カードをクリック', 'デッキから1枚削除'],
    ['Shift + カードをクリック', 'デッキに1枚追加'],
    ['カードを右クリック', '検索結果でフォーカス', '表示されていない場合は絞り込みを解除'],
  ] },
  { group: 'キーボード', items: [
    ['F', 'マウス位置の語でキーワード検索', '属性 / 種族 / 名前 / バッヂ など'],
    ['Esc', 'モーダルを閉じる / 全フィルタを規定値に戻す'],
  ] },
];

function renderHelpTable() {
  const t = document.getElementById('help-table');
  t.innerHTML = OPERATIONS.map(({ group, items }) =>
    '<tr><td colspan="2" class="pt-3 pb-1 text-xs font-bold text-indigo-400 uppercase tracking-wide first:pt-0">' + esc(group) + '</td></tr>' +
    items.map(([op, result, note]) =>
      '<tr class="border-b border-gray-700">' +
      '<td class="py-1.5 pr-3 align-top whitespace-nowrap"><kbd class="bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs">' + esc(op) + '</kbd></td>' +
      '<td class="py-1.5 text-gray-300">' + esc(result) +
      (note ? '<div class="text-gray-500 text-xs mt-0.5">' + esc(note) + '</div>' : '') +
      '</td></tr>'
    ).join('')
  ).join('');
}

export function openHelpModal() {
  renderHelpTable();
  document.getElementById('help-modal').classList.remove('hidden');
}

function closeHelpModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('help-modal').classList.add('hidden');
}

const TEXT_INPUT_TYPES = new Set(['', 'text', 'search', 'url', 'tel', 'email', 'password', 'number']);

// テキスト入力中のみキーボード操作を無効にする(チェックボックスやボタンは対象外)
function isTypingTarget(el) {
  if (!el) return false;
  const target = el.closest ? el.closest('input, textarea, [contenteditable], [contenteditable="true"]') : el;
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'TEXTAREA') return !target.readOnly && !target.disabled;
  if (tag !== 'INPUT') return false;
  const type = String(target.type || '').toLowerCase();
  return TEXT_INPUT_TYPES.has(type) && !target.readOnly && !target.disabled;
}

// init() から呼ばれる、操作ヘルプ・グローバルキーボード操作関連のイベント登録。
export function wireHelpEvents() {
  const $ = id => document.getElementById(id);
  $('help-btn').addEventListener('click', openHelpModal);
  $('help-close').addEventListener('click', () => closeHelpModal());
  $('help-modal').addEventListener('click', closeHelpModal);

  document.addEventListener('keydown', e => {
    const focusEl = document.activeElement || e.target;
    if (e.key === 'Escape') {
      const helpModal = $('help-modal');
      const tama = $('tama-modal');
      if (helpModal && !helpModal.classList.contains('hidden')) { helpModal.classList.add('hidden'); return; }
      if (tama && !tama.classList.contains('hidden')) { closeTamaPicker(); return; }
      // 入力欄/編集中はフォーカスを外すだけ(意図しないリセットを防ぐ)
      if (isTypingTarget(focusEl)) { if (focusEl.blur) focusEl.blur(); return; }
      resetAllFilters();  // Escape で全フィルタをデフォルトに戻す
      return;
    }
    if (isTypingTarget(focusEl)) return;
    if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      keywordSearchAtCursor();
    }
  });
}
