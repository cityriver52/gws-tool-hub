/**
 * Catalogシートから掲載済みアイテムを読み取る。
 * Web表示・今日の発見・Newsletter出力はすべてこの関数を共通利用する。
 */
function getPublishedCatalogItems_() {
  const sheet = getRequiredSheet_(getSpreadsheet_(), CONFIG.CATALOG_SHEET);
  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const column = createColumnMap_(headers);

  const requiredHeaders = [
    'スレッドID',
    '親投稿ID',
    '初回投稿日',
    '最終更新日時',
    'AI処理用本文',
    'タイトル',
    '紹介文',
    'タグ',
    '掲載判定'
  ];
  requireColumns_(column, requiredHeaders, CONFIG.CATALOG_SHEET);

  return values
    .filter(row => String(row[column['掲載判定']] || '').trim() === '掲載')
    .map(row => mapCatalogRowToItem_(row, column))
    .sort((a, b) => b.lastUpdatedTimestamp - a.lastUpdatedTimestamp);
}

function mapCatalogRowToItem_(row, column) {
  const threadId = String(row[column['スレッドID']] || '');
  const parentPostId = String(row[column['親投稿ID']] || '');
  const firstPost = row[column['初回投稿日']];
  const lastUpdated = row[column['最終更新日時']] || firstPost;
  const tags = parseTags_(row[column['タグ']]);

  return {
    threadId,
    parentPostId,
    title: String(row[column['タイトル']] || 'タイトル未設定'),
    description: String(row[column['紹介文']] || ''),
    tags,
    firstPostAt: formatWebDate_(firstPost),
    firstPostTimestamp: getTime_(firstPost),
    lastUpdatedAt: formatWebDate_(lastUpdated),
    lastUpdatedTimestamp: getTime_(lastUpdated),
    searchText: [
      row[column['タイトル']],
      row[column['紹介文']],
      row[column['タグ']],
      row[column['AI処理用本文']]
    ]
      .map(value => String(value || ''))
      .join('\n'),
    chatUrl: buildChatUrl_(threadId, parentPostId)
  };
}

function getRequiredSheet_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`シート「${sheetName}」がありません。`);
  return sheet;
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
