/**
 * 第2スプレッドシートから本日のDailyDiscoveryを取得する。
 */
function getTodaysNewsletterDiscovery_() {
  const ss = SpreadsheetApp.openById(getRequiredNewsletterSpreadsheetId_());
  const sheet = ss.getSheetByName(CONFIG.DISCOVERY_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift();
  const column = createColumnMap_(headers);
  requireColumns_(column, DAILY_DISCOVERY_HEADERS, CONFIG.DISCOVERY_SHEET);

  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');

  return values
    .filter(row => String(row[column['日付']] || '').trim() === today)
    .slice(0, 3)
    .map(row => ({
      badge: String(row[column['種別']] || ''),
      threadId: String(row[column['スレッドID']] || ''),
      title: String(row[column['タイトル']] || ''),
      description: String(row[column['紹介文']] || ''),
      tags: parseTags_(row[column['タグ']]),
      chatUrl: String(row[column['Chat URL']] || '')
    }));
}

function getRequiredNewsletterSpreadsheetId_() {
  const id = String(CONFIG.NEWSLETTER_SPREADSHEET_ID || '').trim();
  if (!id || id.includes('ここに')) {
    throw new Error('CONFIG.NEWSLETTER_SPREADSHEET_ID が未設定です。');
  }
  return id;
}
