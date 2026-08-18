function getSpreadsheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('バインド先スプレッドシートを取得できませんでした。');
  }
  return ss;
}

function createColumnMap_(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const name = String(header || '').trim();
    if (name) map[name] = index;
  });
  return map;
}

function validateHeaders_(sheet, expectedHeaders) {
  const actual = sheet
    .getRange(1, 1, 1, expectedHeaders.length)
    .getDisplayValues()[0];

  expectedHeaders.forEach((expected, index) => {
    if (actual[index] !== expected) {
      throw new Error(
        `シート「${sheet.getName()}」の${index + 1}列目が不正です。\n` +
        `期待値: ${expected}\n現在値: ${actual[index]}`
      );
    }
  });
}

function getTime_(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDateTime_(value) {
  const timestamp = getTime_(value);
  if (!timestamp) return '';

  return Utilities.formatDate(
    new Date(timestamp),
    CONFIG.TIMEZONE,
    'yyyy/MM/dd HH:mm:ss'
  );
}

function formatWebDate_(value) {
  const timestamp = getTime_(value);
  if (!timestamp) return '';

  return Utilities.formatDate(
    new Date(timestamp),
    CONFIG.TIMEZONE,
    'yyyy/MM/dd HH:mm'
  );
}

function withScriptLock_(callback) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    console.log('別の同期処理が実行中のため終了しました。');
    return null;
  }

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}
