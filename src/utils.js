// 文字列エスケープ・ハイライト・デバウンスなど、特定のドメインに属さない汎用ヘルパー。
export function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function highlight(s, q) {
  const escaped = esc(s);
  if (!q) return escaped;
  const escapedQ = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(escapedQ, 'gi'), m => '<mark>' + m + '</mark>');
}

// HTMLタグをスキップしてテキスト部分のみにハイライトを適用する
export function highlightHtml(html, q) {
  if (!q || !html) return html;
  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(
    new RegExp('(<[^>]*>)|(' + escapedQ + ')', 'gi'),
    (match, tag) => tag ? tag : '<mark>' + match + '</mark>'
  );
}

export function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, ''); }

let debTimer = null;
export function debounce(fn, ms = 250) {
  clearTimeout(debTimer);
  debTimer = setTimeout(fn, ms);
}
