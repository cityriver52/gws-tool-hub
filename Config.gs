const CONFIG = {
  // Google Chatの対象スペース。例: spaces/AAAAAAAAAAA
  SPACE_NAME: 'spaces/ここにスペースID',

  CHAT_SHEET: 'ChatMessages',
  CATALOG_SHEET: 'Catalog',

  TIMEZONE: 'Asia/Tokyo',
  OVERLAP_MINUTES: 30,
  LAST_SYNC_PROPERTY: 'LAST_CHAT_SYNC_AT',

  // メルマガ専用の第2スプレッドシートID。
  // 元スプレッドシートとは分離し、組織内の購読者にはこちらだけ閲覧権限を付与する。
  NEWSLETTER_SPREADSHEET_ID: 'ここにメルマガ用スプレッドシートID',

  // 別Apps Scriptプロジェクトとしてデプロイする個人配信設定Webアプリの /exec URL。
  SUBSCRIPTION_WEB_APP_URL: 'ここにメルマガ用WebアプリURL'
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
