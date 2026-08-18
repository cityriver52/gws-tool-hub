const NEWSLETTER_CATALOG_SHEET = 'NewsletterCatalog';
const NEWSLETTER_DISCOVERY_SHEET = 'DailyDiscovery';

const NEWSLETTER_CATALOG_HEADERS = [
  'スレッドID',
  '親投稿ID',
  '初回投稿日',
  '最終更新日時',
  'タイトル',
  '紹介文',
  'タグ',
  'Chat URL'
];

const NEWSLETTER_DISCOVERY_HEADERS = [
  '日付',
  '種別',
  'スレッドID',
  'タイトル',
  '紹介文',
  'タグ',
  'Chat URL'
];

/**
 * 掲載済みCatalogと「今日の発見」3件だけをメルマガ専用スプレッドシートへ同期する。
 * 元のChat本文・AI処理用本文・Workspace Studio用列は外へ出さない。
 */
function syncNewsletterData() {
  const spreadsheetId = String(CONFIG.NEWSLETTER_SPREADSHEET_ID || '').trim();
  if (!spreadsheetId || spreadsheetId.includes('ここに')) {
    throw new Error('CONFIG.NEWSLETTER_SPREADSHEET_ID が未設定です。');
  }

  const newsletterSs = SpreadsheetApp.openById(spreadsheetId);
  const data = getCatalogData();

  const catalogSheet = getOrCreateNewsletterSheet_(
    newsletterSs,
    NEWSLETTER_CATALOG_SHEET,
    NEWSLETTER_CATALOG_HEADERS
  );
  const discoverySheet = getOrCreateNewsletterSheet_(
    newsletterSs,
    NEWSLETTER_DISCOVERY_SHEET,
    NEWSLETTER_DISCOVERY_HEADERS
  );

  const catalogRows = data.items.map(item => [
    item.threadId,
    item.parentPostId,
    item.firstPostAt,
    item.lastUpdatedAt,
    item.title,
    item.description,
    (item.tags || []).join(', '),
    item.chatUrl
  ]);

  replaceNewsletterRows_(catalogSheet, NEWSLETTER_CATALOG_HEADERS, catalogRows);

  const dateKey = getDiscoveryDateKey_(new Date());
  const discoveryRows = (data.dailyDiscovery || []).map(pick => [
    dateKey,
    pick.badge,
    pick.item.threadId,
    pick.item.title,
    pick.item.description,
    (pick.item.tags || []).join(', '),
    pick.item.chatUrl
  ]);

  replaceNewsletterRows_(
    discoverySheet,
    NEWSLETTER_DISCOVERY_HEADERS,
    discoveryRows
  );

  return {
    catalogCount: catalogRows.length,
    discoveryCount: discoveryRows.length,
    date: dateKey
  };
}

/**
 * 通常同期から呼ぶ安全版。
 * メルマガ側が未設定・一時エラーでもChat同期自体は失敗させない。
 */
function trySyncNewsletterData_() {
  const spreadsheetId = String(CONFIG.NEWSLETTER_SPREADSHEET_ID || '').trim();
  if (!spreadsheetId || spreadsheetId.includes('ここに')) return;

  try {
    syncNewsletterData();
  } catch (error) {
    console.error('メルマガ用データ同期に失敗しました: ' + error.message);
  }
}

function getOrCreateNewsletterSheet_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  const currentHeaders = sheet
    .getRange(1, 1, 1, headers.length)
    .getDisplayValues()[0];

  const headerMismatch = headers.some((header, index) => currentHeaders[index] !== header);
  if (headerMismatch) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function replaceNewsletterRows_(sheet, headers, rows) {
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), headers.length);

  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.setFrozenRows(1);
}
