/**
 * 掲載判定が「掲載」のCatalogだけをWebアプリへ返す。
 */
function getCatalogData() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(CONFIG.CATALOG_SHEET);

  if (!sheet) {
    throw new Error(`シート「${CONFIG.CATALOG_SHEET}」がありません。`);
  }

  if (sheet.getLastRow() < 2) {
    return { items: [], tags: [], generatedAt: formatWebDate_(new Date()) };
  }

  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const column = createColumnMap_(headers);

  [
    'スレッドID',
    '親投稿ID',
    '初回投稿日',
    '最終更新日時',
    'スレッド本文',
    'タイトル',
    '紹介文',
    'タグ',
    '掲載判定'
  ].forEach(name => {
    if (column[name] === undefined) {
      throw new Error(`Catalogシートに「${name}」列がありません。`);
    }
  });

  const tagSet = new Set();

  const items = values
    .filter(row => String(row[column['掲載判定']] || '').trim() === '掲載')
    .map(row => {
      const threadId = String(row[column['スレッドID']] || '');
      const parentPostId = String(row[column['親投稿ID']] || '');
      const tags = parseTags_(row[column['タグ']]);
      const firstPost = row[column['初回投稿日']];

      tags.forEach(tag => tagSet.add(tag));

      return {
        threadId,
        parentPostId,
        title: String(row[column['タイトル']] || 'タイトル未設定'),
        description: String(row[column['紹介文']] || ''),
        tags,
        firstPostAt: formatWebDate_(firstPost),
        firstPostTimestamp: getTime_(firstPost),
        lastUpdatedAt: formatWebDate_(row[column['最終更新日時']]),
        searchText: [
          row[column['タイトル']],
          row[column['紹介文']],
          row[column['タグ']],
          row[column['スレッド本文']]
        ]
          .map(value => String(value || ''))
          .join('\n'),
        chatUrl: buildChatUrl_(threadId, parentPostId)
      };
    });

  items.sort((a, b) => b.firstPostTimestamp - a.firstPostTimestamp);

  const tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'ja'));

  return {
    items,
    tags,
    generatedAt: formatWebDate_(new Date())
  };
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
