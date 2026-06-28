// 操作ヘルプ(ショートカット一覧)モーダルと、グローバルなキーボード操作。
import { esc } from './utils.js';
import { resetAllFilters } from './filters.js';
import { keywordSearchAtCursor } from './keyword.js';
import { closeTamaPicker } from './deck.js';

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

export function openShortcutModal() {
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

// init() から呼ばれる、操作ヘルプ・キーボードショートカット関連のイベント登録。
export function wireShortcutEvents() {
  const $ = id => document.getElementById(id);
  $('shortcut-btn').addEventListener('click', openShortcutModal);
  $('shortcut-close').addEventListener('click', () => closeShortcutModal());
  $('shortcut-modal').addEventListener('click', closeShortcutModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const sc = $('shortcut-modal');
      const tama = $('tama-modal');
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
}
