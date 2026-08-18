function doGet() {
  return HtmlService
    .createTemplateFromFile('Subscription')
    .evaluate()
    .setTitle('GWS Tool Hub - 毎日配信の設定')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
