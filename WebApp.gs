function doGet(e) {
  const mode = String(e && e.parameter && e.parameter.mode || '');

  if (mode === 'subscription') {
    return HtmlService
      .createTemplateFromFile('Subscription')
      .evaluate()
      .setTitle('GWS Tool Hub - 毎日配信の設定')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  const template = HtmlService.createTemplateFromFile('Index');
  template.subscriptionUrl = getSubscriptionSettingsUrl_();

  return template
    .evaluate()
    .setTitle('GWS Tool Hub')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSubscriptionSettingsUrl_() {
  const baseUrl = String(CONFIG.SUBSCRIPTION_WEB_APP_URL || '').trim();
  if (!baseUrl || baseUrl.includes('ここに')) return '';

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}mode=subscription`;
}
