/**
 * 「使ってます」を登録／解除する。
 * メールアドレスは内部IDとしてUsageシートにのみ保存し、Web側には返さない。
 */
function toggleUsage(threadId) {
  if (!threadId) throw new Error('スレッドIDが指定されていません。');

  const email = getCurrentUserEmail_();
  validatePublishedThread_(threadId);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName(CONFIG.USAGE_SHEET);
    if (!sheet) throw new Error(`シート「${CONFIG.USAGE_SHEET}」がありません。`);

    validateHeaders_(sheet, USAGE_HEADERS);

    const rows = sheet.getLastRow() >= 2
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, USAGE_HEADERS.length).getValues()
      : [];

    let existingRow = -1;
    rows.forEach((row, index) => {
      if (String(row[0]) === String(threadId) && normalizeEmail_(row[1]) === email) {
        existingRow = index + 2;
      }
    });

    let isUsing;
    if (existingRow !== -1) {
      sheet.deleteRow(existingRow);
      isUsing = false;
    } else {
      sheet.appendRow([threadId, email, new Date()]);
      isUsing = true;
    }

    return {
      threadId,
      isUsing,
      usageCount: countUsageForThread_(sheet, threadId)
    };
  } finally {
    lock.releaseLock();
  }
}

function getCurrentUserEmail_() {
  const email = normalizeEmail_(Session.getActiveUser().getEmail());
  if (!email) {
    throw new Error('ユーザーを確認できませんでした。組織のGoogleアカウントでログインしてからもう一度お試しください。');
  }
  return email;
}

function countUsageForThread_(sheet, threadId) {
  if (sheet.getLastRow() < 2) return 0;
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getValues()
    .filter(row => String(row[0]) === String(threadId))
    .length;
}

function validatePublishedThread_(threadId) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(CONFIG.CATALOG_SHEET);
  if (!sheet) throw new Error(`シート「${CONFIG.CATALOG_SHEET}」がありません。`);

  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const map = createColumnMap_(headers);

  const exists = values.some(row =>
    String(row[map['スレッドID']] || '') === String(threadId) &&
    String(row[map['掲載判定']] || '').trim() === '掲載'
  );

  if (!exists) throw new Error('この項目は現在掲載されていません。');
}
