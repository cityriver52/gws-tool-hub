const CONFIG = {
  // 本体から公開用データを書き出す第2スプレッドシート。
  NEWSLETTER_SPREADSHEET_ID: 'ここにメルマガ用スプレッドシートID',
  DISCOVERY_SHEET: 'DailyDiscovery',

  // GWS Tool Hub本体のWebアプリURL。
  HUB_WEB_APP_URL: 'ここにGWS Tool Hub本体のWebアプリURL',

  TIMEZONE: 'Asia/Tokyo',

  // 個人トリガーの実行時間帯。
  DAILY_DISCOVERY_HOUR: 8
};

const DAILY_DISCOVERY_HEADERS = [
  '日付',
  '種別',
  'スレッドID',
  'タイトル',
  '紹介文',
  'タグ',
  'Chat URL'
];
