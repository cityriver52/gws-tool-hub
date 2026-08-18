const DAILY_DISCOVERY_TRIGGER_HANDLER = 'sendMyDailyDiscovery';

function getMyDailyDiscoverySubscriptionStatus() {
  const email = getRequiredEffectiveUserEmail_();
  return {
    subscribed: getMyDailyDiscoveryTriggers_().length > 0,
    email,
    hour: CONFIG.DAILY_DISCOVERY_HOUR
  };
}

function subscribeMyDailyDiscovery() {
  const email = getRequiredEffectiveUserEmail_();
  const existing = getMyDailyDiscoveryTriggers_();

  if (existing.length === 0) {
    ScriptApp
      .newTrigger(DAILY_DISCOVERY_TRIGGER_HANDLER)
      .timeBased()
      .atHour(CONFIG.DAILY_DISCOVERY_HOUR)
      .everyDays(1)
      .inTimezone(CONFIG.TIMEZONE)
      .create();
  }

  return {
    subscribed: true,
    email,
    hour: CONFIG.DAILY_DISCOVERY_HOUR
  };
}

function unsubscribeMyDailyDiscovery() {
  const email = getRequiredEffectiveUserEmail_();

  getMyDailyDiscoveryTriggers_().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  return {
    subscribed: false,
    email,
    hour: CONFIG.DAILY_DISCOVERY_HOUR
  };
}

/**
 * 各利用者本人が所有するインストール型トリガーから毎日実行される。
 * メルマガ専用スプレッドシートの「DailyDiscovery」だけを読み、本人から本人へ送る。
 */
function sendMyDailyDiscovery() {
  const email = getRequiredEffectiveUserEmail_();
  const picks = getTodaysNewsletterDiscovery_();

  if (picks.length === 0) {
    console.log('本日のDailyDiscoveryがないため配信しませんでした。');
    return;
  }

  const dateLabel = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'M月d日');
  const subject = `【GWS Tool Hub】${dateLabel}の今日の発見`;

  MailApp.sendEmail({
    to: email,
    subject,
    body: buildDailyDiscoveryPlainText_(picks),
    htmlBody: buildDailyDiscoveryHtml_(picks),
    name: 'GWS Tool Hub'
  });
}

function getTodaysNewsletterDiscovery_() {
  const spreadsheetId = String(CONFIG.NEWSLETTER_SPREADSHEET_ID || '').trim();
  if (!spreadsheetId || spreadsheetId.includes('ここに')) {
    throw new Error('CONFIG.NEWSLETTER_SPREADSHEET_ID が未設定です。');
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(CONFIG.DISCOVERY_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift();
  const column = createColumnMap_(headers);

  DAILY_DISCOVERY_HEADERS.forEach(header => {
    if (column[header] === undefined) {
      throw new Error(`DailyDiscoveryシートに「${header}」列がありません。`);
    }
  });

  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');

  return values
    .filter(row => String(row[column['日付']] || '').trim() === today)
    .slice(0, 3)
    .map(row => ({
      badge: String(row[column['種別']] || ''),
      threadId: String(row[column['スレッドID']] || ''),
      title: String(row[column['タイトル']] || ''),
      description: String(row[column['紹介文']] || ''),
      tags: parseTags_(row[column['タグ']]),
      chatUrl: String(row[column['Chat URL']] || '')
    }));
}

function getMyDailyDiscoveryTriggers_() {
  return ScriptApp.getProjectTriggers().filter(trigger =>
    trigger.getHandlerFunction() === DAILY_DISCOVERY_TRIGGER_HANDLER
  );
}

function getRequiredEffectiveUserEmail_() {
  const email = String(Session.getEffectiveUser().getEmail() || '').trim();
  if (!email) {
    throw new Error('Googleアカウントのメールアドレスを取得できませんでした。');
  }
  return email;
}

function createColumnMap_(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const name = String(header || '').trim();
    if (name) map[name] = index;
  });
  return map;
}

function parseTags_(value) {
  if (!value) return [];
  return String(value)
    .split(/[,、，\n]+/)
    .map(tag => tag.trim().replace(/^#+/, ''))
    .filter(Boolean);
}

function buildDailyDiscoveryPlainText_(picks) {
  const lines = [
    '今日のGWS発見 3選',
    '',
    'GWS Tool Hubから、今日の3件をお届けします。',
    ''
  ];

  picks.forEach((pick, index) => {
    lines.push(`${index + 1}. ${pick.badge}`);
    lines.push(pick.title);
    if (pick.description) lines.push(pick.description);
    if (pick.tags.length > 0) lines.push(pick.tags.map(tag => `#${tag}`).join(' '));
    if (pick.chatUrl) lines.push(pick.chatUrl);
    lines.push('');
  });

  lines.push('このメールは、あなた自身が設定したGWS Tool Hubの個人配信トリガーから送信されています。');
  lines.push('配信停止はGWS Tool Hubの「毎日受け取る」から設定画面を開いて行えます。');

  return lines.join('\n');
}

function buildDailyDiscoveryHtml_(picks) {
  const cards = picks.map(pick => {
    const title = escapeHtmlForMail_(pick.title);
    const description = escapeHtmlForMail_(pick.description || '');
    const badge = escapeHtmlForMail_(pick.badge);
    const chatUrl = escapeHtmlAttributeForMail_(pick.chatUrl || '');
    const tags = (pick.tags || [])
      .map(tag => `#${escapeHtmlForMail_(tag)}`)
      .join(' · ');

    return `
      <div style="margin:0 0 18px;padding:18px;border:1px solid #dfe6f2;border-radius:14px;background:#ffffff;">
        <div style="margin-bottom:8px;font-size:12px;font-weight:700;color:#52627c;">${badge}</div>
        <div style="font-size:18px;font-weight:700;line-height:1.5;color:#1f2937;">${title}</div>
        ${description ? `<div style="margin-top:8px;font-size:14px;line-height:1.8;color:#4b5563;">${description}</div>` : ''}
        ${tags ? `<div style="margin-top:10px;font-size:12px;color:#718096;">${tags}</div>` : ''}
        ${chatUrl ? `<div style="margin-top:14px;"><a href="${chatUrl}" style="color:#2f6fed;text-decoration:none;font-weight:700;">Chatで見る →</a></div>` : ''}
      </div>`;
  }).join('');

  return `
    <div style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,'Noto Sans JP',sans-serif;color:#1f2937;">
      <div style="max-width:680px;margin:0 auto;">
        <div style="margin-bottom:20px;">
          <div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#718096;">TODAY'S DISCOVERY</div>
          <h1 style="margin:5px 0 6px;font-size:24px;">今日のGWS発見 3選</h1>
          <div style="font-size:14px;color:#667085;">GWS Tool Hubから、今日の3件をお届けします。</div>
        </div>
        ${cards}
        <div style="margin-top:18px;font-size:11px;line-height:1.7;color:#8a94a6;">
          このメールは、あなた自身が設定したGWS Tool Hubの個人配信トリガーから送信されています。<br>
          配信停止はGWS Tool Hubの「毎日受け取る」から設定画面を開いて行えます。
        </div>
      </div>
    </div>`;
}

function escapeHtmlForMail_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlAttributeForMail_(value) {
  return escapeHtmlForMail_(value);
}
