// 操作ヘルプモーダルと、グローバルなキーボード操作。
import { esc } from './utils.js';
import { resetAllFilters } from './filters.js';
import { keywordSearchAtCursor } from './keyword.js';
import { closeTamaPicker } from './deck.js';

// UIエリアごとに分類しておくと一覧がぱっと見で把握しやすい。
// 各項目は [操作, 結果, 補足(任意・小さく添える)]。
const OPERATIONS = [
  { group: '検索', items: [
    ['Ctrl + 属性・種族をクリック', '複数選択（トグル）'],
  ] },
  { group: '検索結果', items: [
    ['カード画像をクリック', 'デッキに1枚追加'],
    ['カードIDをクリック', '内部Jsonを表示'],
    ['参照先カード名をクリック', '参照先カードの表示'],
    ['属性・種族・タイプをクリック', '検索に反映'],
    ['各列名をクリック', '結果をソート'],
  ] },
  { group: 'デッキ', items: [
    ['カードをクリック', 'デッキから1枚削除'],
    ['Shift + カードをクリック', 'デッキに1枚追加'],
    ['カードを右クリック', '検索結果でフォーカス', '表示されていない場合は絞り込みを解除'],
  ] },
  { group: 'キーボード', items: [
    ['F', 'マウス位置の語でキーワード検索', '属性 / 種族 / 名前など'],
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

// 入力欄にフォーカスがある時はキーボード操作を無効にする
function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

// init() から呼ばれる、操作ヘルプ・グローバルキーボード操作関連のイベント登録。
export function wireHelpEvents() {
  const $ = id => document.getElementById(id);
  $('help-btn').addEventListener('click', openHelpModal);
  $('help-close').addEventListener('click', () => closeHelpModal());
  $('help-modal').addEventListener('click', closeHelpModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const helpModal = $('help-modal');
      const tama = $('tama-modal');
      if (helpModal && !helpModal.classList.contains('hidden')) { helpModal.classList.add('hidden'); return; }
      if (tama && !tama.classList.contains('hidden')) { closeTamaPicker(); return; }
      // 入力欄/編集中はフォーカスを外すだけ(意図しないリセットを防ぐ)
      if (isTypingTarget(e.target)) { if (e.target.blur) e.target.blur(); return; }
      resetAllFilters();  // Escape で全フィルタをデフォルトに戻す
      return;
    }
    if (isTypingTarget(e.target)) return;
    if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      keywordSearchAtCursor();
    }
  });
}
