function createColumnMap_(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const name = String(header || '').trim();
    if (name) map[name] = index;
  });
  return map;
}

function requireColumns_(columnMap, headers, sheetName) {
  headers.forEach(header => {
    if (columnMap[header] === undefined) {
      throw new Error(`${sheetName}シートに「${header}」列がありません。`);
    }
  });
}

function parseTags_(value) {
  if (!value) return [];

  const result = [];
  const seen = new Set();

  String(value)
    .split(/[,、，\n]+/)
    .forEach(tag => {
      const normalized = tag.trim().replace(/^#+/, '');
      if (!normalized) return;

      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(normalized);
    });

  return result;
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getRequiredEffectiveUserEmail_() {
  const email = String(Session.getEffectiveUser().getEmail() || '').trim();
  if (!email) {
    throw new Error('Googleアカウントのメールアドレスを取得できませんでした。');
  }
  return email;
}

function getSubscriptionSettingsUrl_() {
  return String(ScriptApp.getService().getUrl() || '').trim();
}
