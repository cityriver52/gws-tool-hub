const CONFIG = {
  // Google Chatの対象スペース。例: spaces/AAAAAAAAAAA
  SPACE_NAME: 'spaces/ここにスペースID',

  CHAT_SHEET: 'ChatMessages',
  CATALOG_SHEET: 'Catalog',

  // メルマガ専用の第2スプレッドシート。
  NEWSLETTER_SPREADSHEET_ID: 'ここにメルマガ用スプレッドシートID',
  NEWSLETTER_DISCOVERY_SHEET: 'DailyDiscovery',

  // メルマガ設定Webアプリ。Hubの「毎日受け取る」から開く。
  SUBSCRIPTION_WEB_APP_URL: 'ここにメルマガ設定WebアプリURL',

  TIMEZONE: 'Asia/Tokyo',
  OVERLAP_MINUTES: 30,
  LAST_SYNC_PROPERTY: 'LAST_CHAT_SYNC_AT'
};

const CHAT_HEADERS = [
  '投稿ID',
  'スレッドID',
  '投稿日',
  '更新日時',
  '本文',
  '取得日時'
];

const CATALOG_HEADERS = [
  'スレッドID',
  '親投稿ID',
  '初回投稿日',
  '最終更新日時',
  'AI処理用本文',
  'タイトル',
  '紹介文',
  'タグ',
  '掲載判定',
  'AI処理状態'
];

const NEWSLETTER_DISCOVERY_HEADERS = [
  '日付',
  '種別',
  'スレッドID',
  'タイトル',
  '紹介文',
  'タグ',
  'Chat URL'
];
