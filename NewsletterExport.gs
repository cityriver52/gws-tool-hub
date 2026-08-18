/**
 * 掲載済みCatalogと「今日の発見」だけをメルマガ専用スプレッドシートへ同期する。
 * Chat本文・AI処理用本文・Workspace Studio管理列は出力しない。
 */
function syncNewsletterData() {
  const newsletterSs = openNewsletterSpreadsheet_();
  const items = getPublishedCatalogItems_();
  const discovery = getTodaysDiscovery_(items);

  writeNewsletterCatalog_(newsletterSs, items);
  writeNewsletterDiscovery_(newsletterSs, discovery);

  return {
    catalogCount: items.length,
    discoveryCount: discovery.length,
    date: getDiscoveryDateKey_(new Date())
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

function writeNewsletterCatalog_(ss, items) {
  const rows = items.map(item => [
    item.threadId,
    item.parentPostId,
    item.firstPostAt,
    item.lastUpdatedAt,
    item.title,
    item.description,
    (item.tags || []).join(', '),
    item.chatUrl
  ]);

  replaceSheetData_(
    ss,
    CONFIG.NEWSLETTER_CATALOG_SHEET,
    NEWSLETTER_CATALOG_HEADERS,
    rows
  );
}

function writeNewsletterDiscovery_(ss, picks) {
  const dateKey = getDiscoveryDateKey_(new Date());
  const rows = picks.map(pick => [
    dateKey,
    pick.badge,
    pick.item.threadId,
    pick.item.title,
    pick.item.description,
    (pick.item.tags || []).join(', '),
    pick.item.chatUrl
  ]);

  replaceSheetData_(
    ss,
    CONFIG.NEWSLETTER_DISCOVERY_SHEET,
    NEWSLETTER_DISCOVERY_HEADERS,
    rows
  );
}

function openNewsletterSpreadsheet_() {
  const spreadsheetId = getRequiredNewsletterSpreadsheetId_();
  return SpreadsheetApp.openById(spreadsheetId);
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
