const DAILY_DISCOVERY_TRIGGER_HANDLER = 'sendMyDailyDiscovery';

/**
 * 現在のユーザーが個人配信トリガーを持っているか返す。
 * 個人配信設定用Webアプリは「アクセスしているユーザーとして実行」で使う。
 */
function getMyDailyDiscoverySubscriptionStatus() {
  const email = getRequiredEffectiveUserEmail_();
  return {
    subscribed: getMyDailyDiscoveryTriggers_().length > 0,
    email,
    hour: CONFIG.DAILY_DISCOVERY_HOUR
  };
}

/**
 * 現在のユーザー自身が所有する毎日配信用トリガーを1つ作成する。
 */
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

/**
 * 現在のユーザー自身が所有する配信用トリガーだけを削除する。
 */
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
 * 個人トリガーから毎日呼ばれる。
 * インストール型トリガーは作成者本人の権限で実行されるため、
 * 本人のアドレスから本人宛てにメールを送る。
 */
function sendMyDailyDiscovery() {
  const email = getRequiredEffectiveUserEmail_();
  const data = getCatalogData();
  const picks = data.dailyDiscovery || [];

  if (picks.length === 0) return;

  const dateLabel = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'M月d日');
  const subject = `【GWS Tool Hub】${dateLabel}の今日の発見`;
  const body = buildDailyDiscoveryPlainText_(picks);
  const htmlBody = buildDailyDiscoveryHtml_(picks);

  MailApp.sendEmail({
    to: email,
    subject,
    body,
    htmlBody,
    name: 'GWS Tool Hub'
  });
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

function buildDailyDiscoveryPlainText_(picks) {
  const lines = [
    '今日のGWS発見 3選',
    '',
    'GWS Tool Hubから、今日の3件をお届けします。',
    ''
  ];

  picks.forEach((pick, index) => {
    const item = pick.item;
    lines.push(`${index + 1}. ${pick.badge}`);
    lines.push(item.title);
    if (item.description) lines.push(item.description);
    if (item.chatUrl) lines.push(item.chatUrl);
    lines.push('');
  });

  lines.push('このメールは、あなた自身が設定したGWS Tool Hubの個人配信トリガーから送信されています。');
  lines.push('配信停止はGWS Tool Hubの「毎日配信の設定」から行えます。');

  return lines.join('\n');
}

function buildDailyDiscoveryHtml_(picks) {
  const cards = picks.map(pick => {
    const item = pick.item;
    const title = escapeHtmlForMail_(item.title);
    const description = escapeHtmlForMail_(item.description || '');
    const badge = escapeHtmlForMail_(pick.badge);
    const chatUrl = escapeHtmlAttributeForMail_(item.chatUrl || '');
    const tags = (item.tags || [])
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
          配信停止はGWS Tool Hubの「毎日配信の設定」から行えます。
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
