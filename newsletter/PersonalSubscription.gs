const DAILY_DISCOVERY_TRIGGER_HANDLER = 'sendMyDailyDiscovery';

function getMyDailyDiscoverySubscriptionStatus() {
  return buildSubscriptionStatus_(getMyDailyDiscoveryTriggers_().length > 0);
}

function subscribeMyDailyDiscovery() {
  if (getMyDailyDiscoveryTriggers_().length === 0) {
    ScriptApp
      .newTrigger(DAILY_DISCOVERY_TRIGGER_HANDLER)
      .timeBased()
      .atHour(CONFIG.DAILY_DISCOVERY_HOUR)
      .everyDays(1)
      .inTimezone(CONFIG.TIMEZONE)
      .create();
  }

  return buildSubscriptionStatus_(true);
}

function unsubscribeMyDailyDiscovery() {
  getMyDailyDiscoveryTriggers_().forEach(trigger => ScriptApp.deleteTrigger(trigger));
  return buildSubscriptionStatus_(false);
}

/**
 * 各利用者本人が所有するインストール型トリガーから毎日実行される。
 */
function sendMyDailyDiscovery() {
  const email = getRequiredEffectiveUserEmail_();
  const picks = getTodaysNewsletterDiscovery_();

  if (picks.length === 0) {
    console.log('本日のDailyDiscoveryがないため配信しませんでした。');
    return;
  }

  const dateLabel = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'M月d日');

  MailApp.sendEmail({
    to: email,
    subject: `【GWS Tool Hub】${dateLabel}の今日の発見`,
    body: buildDailyDiscoveryPlainText_(picks),
    htmlBody: buildDailyDiscoveryHtml_(picks),
    name: 'GWS Tool Hub'
  });
}

function getMyDailyDiscoveryTriggers_() {
  return ScriptApp.getProjectTriggers().filter(trigger =>
    trigger.getHandlerFunction() === DAILY_DISCOVERY_TRIGGER_HANDLER
  );
}

function buildSubscriptionStatus_(subscribed) {
  return {
    subscribed,
    email: getRequiredEffectiveUserEmail_(),
    hour: CONFIG.DAILY_DISCOVERY_HOUR
  };
}
