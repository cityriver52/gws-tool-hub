function buildDailyDiscoveryPlainText_(picks) {
  const hubUrl = getHubWebAppUrl_();
  const settingsUrl = getSubscriptionSettingsUrl_();
  const lines = [
    '今日のGWS再発見 3選',
    '',
    'GWS Tool Hubから、今日の再発見3件をお届けします。',
    ''
  ];

  picks.forEach((pick, index) => {
    lines.push(`${index + 1}. ${pick.badge}`);
    lines.push(pick.title);
    if (pick.description) lines.push(pick.description);
    if (pick.tags.length > 0) {
      lines.push(pick.tags.map(tag => `#${tag}`).join(' '));
    }
    if (pick.chatUrl) lines.push(pick.chatUrl);
    lines.push('');
  });

  if (hubUrl) {
    lines.push('GWS Tool Hubを開く');
    lines.push(hubUrl);
    lines.push('');
  }

  if (settingsUrl) {
    lines.push('配信停止はこちら');
    lines.push(settingsUrl);
  }

  return lines.join('\n');
}

function buildDailyDiscoveryHtml_(picks) {
  const cards = picks.map(renderDiscoveryCardHtml_).join('');
  const hubUrl = escapeHtml_(getHubWebAppUrl_());
  const settingsUrl = escapeHtml_(getSubscriptionSettingsUrl_());
  const hubLink = hubUrl
    ? `<div style="margin-top:22px;"><a href="${hubUrl}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#2f6fed;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;">GWS Tool Hubを開く →</a></div>`
    : '';
  const unsubscribeLink = settingsUrl
    ? `<div style="margin-top:18px;font-size:12px;line-height:1.7;color:#8a94a6;"><a href="${settingsUrl}" style="color:#667085;text-decoration:underline;">配信停止はこちら</a></div>`
    : '';

  return `
    <div style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,'Noto Sans JP',sans-serif;color:#1f2937;">
      <div style="max-width:680px;margin:0 auto;">
        <div style="margin-bottom:20px;">
          <div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#718096;">TODAY'S REDISCOVERY</div>
          <h1 style="margin:5px 0 6px;font-size:24px;">今日のGWS再発見 3選</h1>
          <div style="font-size:14px;color:#667085;">GWS Tool Hubから、今日の再発見3件をお届けします。</div>
        </div>
        ${cards}
        ${hubLink}
        ${unsubscribeLink}
      </div>
    </div>`;
}

function renderDiscoveryCardHtml_(pick) {
  const title = escapeHtml_(pick.title);
  const description = escapeHtml_(pick.description || '');
  const badge = escapeHtml_(pick.badge);
  const chatUrl = escapeHtml_(pick.chatUrl || '');
  const tags = (pick.tags || [])
    .map(tag => `#${escapeHtml_(tag)}`)
    .join(' · ');

  return `
    <div style="margin:0 0 18px;padding:18px;border:1px solid #dfe6f2;border-radius:14px;background:#ffffff;">
      <div style="margin-bottom:8px;font-size:12px;font-weight:700;color:#52627c;">${badge}</div>
      <div style="font-size:18px;font-weight:700;line-height:1.5;color:#1f2937;">${title}</div>
      ${description ? `<div style="margin-top:8px;font-size:14px;line-height:1.8;color:#4b5563;">${description}</div>` : ''}
      ${tags ? `<div style="margin-top:10px;font-size:12px;color:#718096;">${tags}</div>` : ''}
      ${chatUrl ? `<div style="margin-top:14px;"><a href="${chatUrl}" style="color:#2f6fed;text-decoration:none;font-weight:700;">Chatで見る →</a></div>` : ''}
    </div>`;
}
