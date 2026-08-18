function doGet() {
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
  const url = String(CONFIG.SUBSCRIPTION_WEB_APP_URL || '').trim();
  return !url || url.includes('ここに') ? '' : url;
}
