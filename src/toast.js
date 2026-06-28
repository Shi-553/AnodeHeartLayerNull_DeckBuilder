// 画面下部に短時間表示する通知(デッキ操作の制限・フィルタ既定値の保存など共通で使う)。
let deckToastTimer = null;
export function deckToast(msg) {
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
