/** 10分程度の定期トリガー用。 */
function runScheduledSync() {
  return runSyncPipeline_(false);
}

/** 初回および1日1回程度の全件同期用。 */
function runFullSync() {
  return runSyncPipeline_(true);
}

function runSyncPipeline_(fullSync) {
  return withScriptLock_(() => {
    const ss = getSpreadsheet_();
    validateSyncSheets_(ss);

    const result = syncChatMessages_(ss, fullSync);
    rebuildCatalog_(ss);
    trySyncNewsletterData_();

    logSyncResult_(result, fullSync);
    return result;
  });
}

function logSyncResult_(result, fullSync) {
  if (fullSync) {
    console.log(`全件同期完了: ${result.total}件`);
    return;
  }

  console.log(
    `通常同期完了: 新規 ${result.inserted}件 / 更新 ${result.updated}件`
  );
}

function syncChatMessages_(ss, fullSync) {
  const sheet = getRequiredSheet_(ss, CONFIG.CHAT_SHEET);
  const now = new Date();
  const startTime = fullSync ? null : getIncrementalStartTime_();

  const records = fetchChatMessages_(startTime)
    .map(message => convertMessageToRow_(message, now))
    .filter(Boolean);

  if (fullSync || !startTime) {
    return replaceChatMessages_(sheet, records, now);
  }

  return upsertChatMessages_(sheet, records, now);
}

function getIncrementalStartTime_() {
  const lastSync = PropertiesService
    .getScriptProperties()
    .getProperty(CONFIG.LAST_SYNC_PROPERTY);

  if (!lastSync) return null;

  return new Date(
    new Date(lastSync).getTime() - CONFIG.OVERLAP_MINUTES * 60 * 1000
  );
}

function replaceChatMessages_(sheet, records, syncedAt) {
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

  finalizeChatSync_(sheet, syncedAt);

  return {
    total: records.length,
    inserted: records.length,
    updated: 0
  };
}

function upsertChatMessages_(sheet, records, syncedAt) {
  const existingRows = sheet.getLastRow() >= 2
    ? sheet
        .getRange(2, 1, sheet.getLastRow() - 1, CHAT_HEADERS.length)
        .getValues()
    : [];

  const existingMap = new Map();
  existingRows.forEach((row, index) => {
    const messageId = String(row[0] || '');
    if (messageId) {
      existingMap.set(messageId, { rowNumber: index + 2, values: row });
    }
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

    if (rowsEqualIgnoringFetchTime_(existing.values, record)) return;

    sheet
      .getRange(existing.rowNumber, 1, 1, CHAT_HEADERS.length)
      .setValues([record]);
    updated++;
  });

  if (newRows.length > 0) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, newRows.length, CHAT_HEADERS.length)
      .setValues(newRows);
  }

  finalizeChatSync_(sheet, syncedAt);

  return {
    total: records.length,
    inserted: newRows.length,
    updated
  };
}

function finalizeChatSync_(sheet, syncedAt) {
  setLastSync_(syncedAt);
  formatChatSheet_(sheet);
}

function fetchChatMessages_(startTime) {
  const allMessages = [];
  const spaceName = getConfiguredSpaceName_();
  let pageToken = '';

  do {
    const params = { pageSize: 1000 };

    if (startTime) {
      params.filter = `createTime > \"${startTime.toISOString()}\"`;
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
      `https://chat.googleapis.com/v1/${spaceName}/messages?${query}`;

    const response = chatApiGet_(url);
    if (response.messages) allMessages.push(...response.messages);
    pageToken = response.nextPageToken || '';
  } while (pageToken);

  return allMessages;
}

/**
 * CONFIG.SPACE_NAME をGoogle Chat APIの resource name に正規化する。
 * 次の入力を許容する。
 * - spaces/AAAAAAAAAAA
 * - AAAAAAAAAAA
 * - https://chat.google.com/room/AAAAAAAAAAA/...
 */
function getConfiguredSpaceName_() {
  const configured = String(CONFIG.SPACE_NAME || '').trim();

  if (!configured || /ここに|スペースID/.test(configured)) {
    throw new Error(
      'Config.gs の SPACE_NAME が未設定です。対象ChatスペースのIDを設定してください。' +
      ' 例: spaces/AAAAAAAAAAA'
    );
  }

  const roomUrlMatch = configured.match(
    /^https?:\/\/chat\.google\.com\/room\/([^/?#]+)/i
  );
  const normalized = roomUrlMatch
    ? `spaces/${roomUrlMatch[1]}`
    : configured.startsWith('spaces/')
      ? configured
      : configured.includes('/')
        ? configured
        : `spaces/${configured}`;

  if (!/^spaces\/[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new Error(
      'Config.gs の SPACE_NAME の形式が正しくありません。' +
      '「spaces/スペースID」、スペースID単体、またはChatの /room/ URLを設定してください。'
    );
  }

  return normalized;
}

function convertMessageToRow_(message, fetchedAt) {
  if (!message.name) return null;

  const createTime = message.createTime ? new Date(message.createTime) : '';
  const updateTime = message.lastUpdateTime
    ? new Date(message.lastUpdateTime)
    : createTime;

  return [
    message.name,
    message.thread?.name || message.name,
    createTime,
    updateTime,
    message.formattedText || message.text || message.fallbackText || '',
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
  const chatSheet = getRequiredSheet_(ss, CONFIG.CHAT_SHEET);
  const catalogSheet = getRequiredSheet_(ss, CONFIG.CATALOG_SHEET);

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
