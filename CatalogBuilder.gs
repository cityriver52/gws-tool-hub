/** Catalogだけを手動再構築したい場合に使用する。 */
function rebuildCatalog() {
  return withScriptLock_(() => {
    const ss = getSpreadsheet_();
    validateSyncSheets_(ss);
    rebuildCatalog_(ss);
  });
}

/**
 * ChatMessagesをスレッド単位にまとめ、Catalogを再構築する。
 * AI生成済みのタイトル・紹介文・タグ等はスレッドID単位で保持する。
 */
function rebuildCatalog_(ss) {
  const chatSheet = ss.getSheetByName(CONFIG.CHAT_SHEET);
  const catalogSheet = ss.getSheetByName(CONFIG.CATALOG_SHEET);

  const chatRows = chatSheet.getLastRow() >= 2
    ? chatSheet
        .getRange(2, 1, chatSheet.getLastRow() - 1, CHAT_HEADERS.length)
        .getValues()
    : [];

  const existingCatalogRows = catalogSheet.getLastRow() >= 2
    ? catalogSheet
        .getRange(2, 1, catalogSheet.getLastRow() - 1, CATALOG_HEADERS.length)
        .getValues()
    : [];

  const existingCatalog = new Map();
  existingCatalogRows.forEach(row => {
    const threadId = String(row[0] || '');
    if (threadId) existingCatalog.set(threadId, row);
  });

  const threads = new Map();

  chatRows.forEach(row => {
    const messageId = String(row[0] || '');
    const threadId = String(row[1] || '');
    if (!messageId || !threadId) return;

    if (!threads.has(threadId)) threads.set(threadId, []);

    threads.get(threadId).push({
      messageId,
      createTime: row[2],
      updateTime: row[3],
      text: row[4]
    });
  });

  const catalogRows = [];

  threads.forEach((messages, threadId) => {
    messages.sort(
      (a, b) => getTime_(a.createTime) - getTime_(b.createTime)
    );

    const root = messages[0];
    const firstPostTime = root.createTime;
    const lastUpdateTime = new Date(
      Math.max(
        ...messages.map(message =>
          Math.max(getTime_(message.createTime), getTime_(message.updateTime))
        )
      )
    );
    const threadText = buildThreadText_(messages);

    const old = existingCatalog.get(threadId);

    let title = '';
    let description = '';
    let tags = '';
    let publishDecision = '';
    let aiStatus = '未処理';
    let aiProcessedAt = '';

    if (old) {
      title = old[5];
      description = old[6];
      tags = old[7];
      publishDecision = old[8];
      aiStatus = old[9] || '未処理';
      aiProcessedAt = old[10];

      const sourceChanged =
        String(old[1] || '') !== String(root.messageId || '') ||
        getTime_(old[2]) !== getTime_(firstPostTime) ||
        getTime_(old[3]) !== getTime_(lastUpdateTime) ||
        String(old[4] || '') !== String(threadText || '');

      if (sourceChanged) {
        aiStatus = aiProcessedAt ? '要再処理' : '未処理';
      }
    }

    catalogRows.push([
      threadId,
      root.messageId,
      firstPostTime,
      lastUpdateTime,
      threadText,
      title,
      description,
      tags,
      publishDecision,
      aiStatus,
      aiProcessedAt
    ]);
  });

  // 新しいスレッドを上に。
  catalogRows.sort((a, b) => getTime_(b[2]) - getTime_(a[2]));

  if (catalogSheet.getLastRow() >= 2) {
    catalogSheet
      .getRange(2, 1, catalogSheet.getLastRow() - 1, CATALOG_HEADERS.length)
      .clearContent();
  }

  if (catalogRows.length > 0) {
    catalogSheet
      .getRange(2, 1, catalogRows.length, CATALOG_HEADERS.length)
      .setValues(catalogRows);
  }

  formatCatalogSheet_(catalogSheet);
}

function buildThreadText_(messages) {
  return messages
    .map((message, index) => {
      const type = index === 0 ? '親投稿' : '返信';
      return (
        `【${type}｜${formatDateTime_(message.createTime)}】\n` +
        `${message.text || ''}`
      );
    })
    .join('\n\n--------------------\n\n');
}

function formatCatalogSheet_(sheet) {
  if (sheet.getLastRow() < 2) return;

  sheet
    .getRange(2, 3, sheet.getLastRow() - 1, 2)
    .setNumberFormat('yyyy/mm/dd hh:mm:ss');

  sheet
    .getRange(2, 11, sheet.getLastRow() - 1, 1)
    .setNumberFormat('yyyy/mm/dd hh:mm:ss');
}
