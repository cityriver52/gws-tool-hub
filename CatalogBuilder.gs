/** Catalogだけを手動再構築したい場合に使用する。 */
function rebuildCatalog() {
  return withScriptLock_(() => {
    const ss = getSpreadsheet_();
    validateSyncSheets_(ss);
    rebuildCatalog_(ss);
  });
}

/**
 * ChatMessagesをスレッド単位にまとめ、Catalogを更新する。
 *
 * Catalogシートは毎回並べ替えたり全件書き直したりせず、
 * - 既存スレッド: 既存行をその場で更新
 * - 新規スレッド: シート末尾へappendRow()で追記
 * とする。
 *
 * 「スレッド本文」は原文を保持し、「AI処理用本文」にはURLを除去した
 * テキストを保存する。Workspace StudioはAI処理用本文だけを参照する。
 *
 * Webアプリ上の表示順はCatalogService.gs側で最終更新日時の降順にするため、
 * シート上の行順には依存しない。
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

  // 既存Catalogは行番号も保持する。新規行を途中へ挿入しないため、
  // Workspace Studioから見ても「末尾に新しい行が増える」形になる。
  const existingCatalog = new Map();
  existingCatalogRows.forEach((row, index) => {
    const threadId = String(row[0] || '');
    if (!threadId) return;

    existingCatalog.set(threadId, {
      rowNumber: index + 2,
      values: row
    });
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

  const newRows = [];
  const activeThreadIds = new Set();

  threads.forEach((messages, threadId) => {
    activeThreadIds.add(threadId);

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
    const aiThreadText = buildAiThreadText_(threadText);

    const existing = existingCatalog.get(threadId);

    if (!existing) {
      // 新しいスレッドは必ず末尾へ追記する。
      newRows.push([
        threadId,
        root.messageId,
        firstPostTime,
        lastUpdateTime,
        threadText,
        '', // タイトル
        '', // 紹介文
        '', // タグ
        '', // 掲載判定
        '未処理',
        '', // AI処理日時
        aiThreadText
      ]);
      return;
    }

    const old = existing.values;
    const sourceChanged =
      String(old[1] || '') !== String(root.messageId || '') ||
      getTime_(old[2]) !== getTime_(firstPostTime) ||
      getTime_(old[3]) !== getTime_(lastUpdateTime) ||
      String(old[4] || '') !== String(threadText || '');

    const oldAiThreadText = String(old[11] || '');
    const aiTextChanged = oldAiThreadText !== aiThreadText;

    if (sourceChanged) {
      // AI生成列は触らず、元データ部分とAI処理用本文だけ更新する。
      catalogSheet
        .getRange(existing.rowNumber, 1, 1, 5)
        .setValues([[
          threadId,
          root.messageId,
          firstPostTime,
          lastUpdateTime,
          threadText
        ]]);

      catalogSheet
        .getRange(existing.rowNumber, 12)
        .setValue(aiThreadText);

      const aiProcessedAt = old[10];
      catalogSheet
        .getRange(existing.rowNumber, 10)
        .setValue(aiProcessedAt ? '要再処理' : '未処理');
    } else if (aiTextChanged) {
      // 導入時の既存行も、次回同期またはrebuildCatalog()でAI用本文を補完する。
      catalogSheet
        .getRange(existing.rowNumber, 12)
        .setValue(aiThreadText);

      // 既にAI処理用本文が存在していて生成結果が変わった場合のみ再処理扱い。
      // 初回移行でL列が空だっただけなら、既存のAI処理状態は維持する。
      if (oldAiThreadText && old[10]) {
        catalogSheet
          .getRange(existing.rowNumber, 10)
          .setValue('要再処理');
      } else if (!String(old[9] || '').trim()) {
        catalogSheet
          .getRange(existing.rowNumber, 10)
          .setValue('未処理');
      }
    } else if (!String(old[9] || '').trim()) {
      // 既存データで状態だけ空欄の場合は未処理に補正する。
      catalogSheet
        .getRange(existing.rowNumber, 10)
        .setValue('未処理');
    }
  });

  // 同期対象から消えたスレッドはCatalogからも削除する。
  // 行番号がずれないよう下から削除する。
  const obsoleteRows = [];
  existingCatalog.forEach((entry, threadId) => {
    if (!activeThreadIds.has(threadId)) {
      obsoleteRows.push(entry.rowNumber);
    }
  });

  obsoleteRows
    .sort((a, b) => b - a)
    .forEach(rowNumber => catalogSheet.deleteRow(rowNumber));

  // 同期1回で複数の新規スレッドが見つかった場合は、
  // 古いもの→新しいものの順に末尾へ積む。
  newRows.sort((a, b) => getTime_(a[2]) - getTime_(b[2]));
  newRows.forEach(row => catalogSheet.appendRow(row));

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

/**
 * Workspace Studioへ渡すため、リンク先コンテンツを参照されないよう
 * スレッド本文からURLを除去する。
 *
 * - Markdownリンク: [表示名](URL) -> 表示名 [リンク省略]
 * - Chat等のリンク表現: <URL|表示名> -> 表示名 [リンク省略]
 * - <URL> / 生URL -> [リンク省略]
 *
 * リンクの表示名は、何について話しているかをAIが理解できるよう残す。
 */
function buildAiThreadText_(threadText) {
  let text = String(threadText || '');

  // Markdown形式のリンク。
  text = text.replace(
    /\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)\s]+\)/gi,
    '$1 [リンク省略]'
  );

  // <URL|表示名> の形式。
  text = text.replace(
    /<(?:(?:https?:\/\/)|(?:www\.))[^>|]+\|([^>]+)>/gi,
    '$1 [リンク省略]'
  );

  // <URL> の形式。
  text = text.replace(
    /<(?:(?:https?:\/\/)|(?:www\.))[^>]+>/gi,
    '[リンク省略]'
  );

  // 生のURL。日本語の閉じ括弧などはURLに含めない。
  text = text.replace(
    /(?:https?:\/\/|www\.)[^\s<>"'）】\]]+/gi,
    '[リンク省略]'
  );

  // mailtoリンクも除去する。
  text = text.replace(/mailto:[^\s<>"']+/gi, '[メールリンク省略]');

  // 連続して同じプレースホルダーだけが並んだ場合は整理する。
  text = text.replace(
    /(?:\[リンク省略\][ \t]*){2,}/g,
    '[リンク省略]'
  );

  return text.trim();
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
