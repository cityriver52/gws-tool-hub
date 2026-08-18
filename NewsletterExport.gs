/**
 * 「今日の発見」3件だけをメルマガ専用スプレッドシートへ同期する。
 * Chat本文・AI処理用本文・Catalog全体は外へ出さない。
 */
function syncNewsletterData() {
  const newsletterSs = SpreadsheetApp.openById(getRequiredNewsletterSpreadsheetId_());
  const items = getPublishedCatalogItems_();
  const discovery = getTodaysDiscovery_(items);
  const dateKey = getDiscoveryDateKey_(new Date());

  const rows = discovery.map(pick => [
    dateKey,
    pick.badge,
    pick.item.threadId,
    pick.item.title,
    pick.item.description,
    (pick.item.tags || []).join(', '),
    pick.item.chatUrl
  ]);

  replaceSheetData_(
    newsletterSs,
    CONFIG.NEWSLETTER_DISCOVERY_SHEET,
    NEWSLETTER_DISCOVERY_HEADERS,
    rows
  );

  return {
    discoveryCount: rows.length,
    date: dateKey
  };
}

/**
 * Chat同期から呼ぶ安全版。
 * Newsletter側の設定不備や一時エラーで本体同期を止めない。
 */
function trySyncNewsletterData_() {
  if (!hasConfiguredNewsletterSpreadsheet_()) return;

  try {
    syncNewsletterData();
  } catch (error) {
    console.error(`メルマガ用データ同期に失敗しました: ${error.message}`);
  }
}

function hasConfiguredNewsletterSpreadsheet_() {
  const id = String(CONFIG.NEWSLETTER_SPREADSHEET_ID || '').trim();
  return Boolean(id && !id.includes('ここに'));
}

function getRequiredNewsletterSpreadsheetId_() {
  if (!hasConfiguredNewsletterSpreadsheet_()) {
    throw new Error('CONFIG.NEWSLETTER_SPREADSHEET_ID が未設定です。');
  }
  return String(CONFIG.NEWSLETTER_SPREADSHEET_ID).trim();
}

function replaceSheetData_(ss, sheetName, headers, rows) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  const clearRows = Math.max(sheet.getLastRow() - 1, 0);
  const clearColumns = Math.max(sheet.getLastColumn(), headers.length);
  if (clearRows > 0) {
    sheet.getRange(2, 1, clearRows, clearColumns).clearContent();
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.setFrozenRows(1);
}
