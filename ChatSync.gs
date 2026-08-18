/**
 * 10分程度の定期トリガー用。
 * 新規投稿と直近の投稿を差分取得し、Catalogを再構築する。
 */
function runScheduledSync() {
  return withScriptLock_(() => {
    const ss = getSpreadsheet_();
    validateSyncSheets_(ss);

    const result = syncChatMessages_(ss, false);
    rebuildCatalog_(ss);
    trySyncNewsletterData_();

    console.log(
      `通常同期完了: 新規 ${result.inserted}件 / 更新 ${result.updated}件`
    );
    return result;
  });
}

/**
 * 初回および1日1回程度の全件同期用。
 * messages.listはlastUpdateTimeで絞れないため、古い投稿の編集を拾う用途にも使う。
 */
function runFullSync() {
  return withScriptLock_(() => {
    const ss = getSpreadsheet_();
    validateSyncSheets_(ss);

    const result = syncChatMessages_(ss, true);
    rebuildCatalog_(ss);
    trySyncNewsletterData_();

    console.log(`全件同期完了: ${result.total}件`);
    return result;
  });
}

function syncChatMessages_(ss, fullSync) {
  const sheet = ss.getSheetByName(CONFIG.CHAT_SHEET);
  const now = new Date();
  let startTime = null;

  if (!fullSync) {
    const lastSync = PropertiesService
      .getScriptProperties()
      .getProperty(CONFIG.LAST_SYNC_PROPERTY);

    if (lastSync) {
      startTime = new Date(
        new Date(lastSync).getTime() - CONFIG.OVERLAP_MINUTES * 60 * 1000
      );
    }
  }

  const records = fetchChatMessages_(startTime)
    .map(message => convertMessageToRow_(message, now))
    .filter(Boolean);

  // 初回または全件同期では取得結果で作り直す。
  if (fullSync || !startTime) {
    records.sort((a, b) => getTime_(a[2]) - getTime_(b[2]));

    if (sheet.getLastRow() >= 2) {
      sheet
        .getRange(2, 1, sheet.getLastRow() - 1, CHAT_HEADERS.length)
        .clearContent();
    }

    if (records.length > 0) {
      sheet
        .getRange(2, 1, records.length, CHAT_HEADERS.length)
        .setValues(records);
    }

    setLastSync_(now);
    formatChatSheet_(sheet);

    return {
      total: records.length,
      inserted: records.length,
      updated: 0
    };
  }

  // 差分同期。投稿IDを主キーにupsertする。
  const existingRows = sheet.getLastRow() >= 2
    ? sheet
        .getRange(2, 1, sheet.getLastRow() - 1, CHAT_HEADERS.length)
        .getValues()
    : [];

  const existingMap = new Map();
  existingRows.forEach((row, index) => {
    const messageId = String(row[0] || '');
    if (!messageId) return;
    existingMap.set(messageId, { rowNumber: index + 2, values: row });
  });

  const newRows = [];
  let updated = 0;

  records.forEach(record => {
    const messageId = String(record[0] || '');
    if (!messageId) return;

    const existing = existingMap.get(messageId);
    if (!existing) {
      newRows.push(record);
      return;
    }

    if (!rowsEqualIgnoringFetchTime_(existing.values, record)) {
      sheet
        .getRange(existing.rowNumber, 1, 1, CHAT_HEADERS.length)
        .setValues([record]);
      updated++;
    }
  });

  if (newRows.length > 0) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, newRows.length, CHAT_HEADERS.length)
      .setValues(newRows);
  }

  setLastSync_(now);
  formatChatSheet_(sheet);

  return {
    total: records.length,
    inserted: newRows.length,
    updated
  };
}

function fetchChatMessages_(startTime) {
  const allMessages = [];
  let pageToken = '';

  do {
    // orderByは指定しない。
    // Google Chat APIの既定値がcreateTime ASCのため、既定順序を利用する。
    const params = {
      pageSize: 1000
    };

    if (startTime) {
      params.filter = `createTime > "${startTime.toISOString()}"`;
    }
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const query = Object.entries(params)
      .map(([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      )
      .join('&');

    const url =
      `https://chat.googleapis.com/v1/${CONFIG.SPACE_NAME}/messages?${query}`;

    const response = chatApiGet_(url);
    if (response.messages) allMessages.push(...response.messages);
    pageToken = response.nextPageToken || '';
  } while (pageToken);

  return allMessages;
}

function convertMessageToRow_(message, fetchedAt) {
  if (!message.name) return null;

  const messageId = message.name;
  const threadId = message.thread?.name || message.name;
  const createTime = message.createTime ? new Date(message.createTime) : '';
  const updateTime = message.lastUpdateTime
    ? new Date(message.lastUpdateTime)
    : createTime;
  const text =
    message.formattedText || message.text || message.fallbackText || '';

  return [
    messageId,
    threadId,
    createTime,
    updateTime,
    text,
    fetchedAt
  ];
}

function chatApiGet_(url) {
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
    },
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error(`Google Chat API Error ${status}\n${body}`);
  }

  return body ? JSON.parse(body) : {};
}

function rowsEqualIgnoringFetchTime_(oldRow, newRow) {
  return (
    String(oldRow[0] || '') === String(newRow[0] || '') &&
    String(oldRow[1] || '') === String(newRow[1] || '') &&
    getTime_(oldRow[2]) === getTime_(newRow[2]) &&
    getTime_(oldRow[3]) === getTime_(newRow[3]) &&
    String(oldRow[4] || '') === String(newRow[4] || '')
  );
}

function setLastSync_(date) {
  PropertiesService
    .getScriptProperties()
    .setProperty(CONFIG.LAST_SYNC_PROPERTY, date.toISOString());
}

function validateSyncSheets_(ss) {
  const chatSheet = ss.getSheetByName(CONFIG.CHAT_SHEET);
  const catalogSheet = ss.getSheetByName(CONFIG.CATALOG_SHEET);

  if (!chatSheet) throw new Error(`シート「${CONFIG.CHAT_SHEET}」がありません。`);
  if (!catalogSheet) throw new Error(`シート「${CONFIG.CATALOG_SHEET}」がありません。`);

  validateHeaders_(chatSheet, CHAT_HEADERS);
  validateHeaders_(catalogSheet, CATALOG_HEADERS);
}

function formatChatSheet_(sheet) {
  if (sheet.getLastRow() < 2) return;

  sheet
    .getRange(2, 3, sheet.getLastRow() - 1, 2)
    .setNumberFormat('yyyy/mm/dd hh:mm:ss');

  sheet
    .getRange(2, 6, sheet.getLastRow() - 1, 1)
    .setNumberFormat('yyyy/mm/dd hh:mm:ss');
}
