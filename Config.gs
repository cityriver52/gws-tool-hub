const CONFIG = {
  // Google Chatの対象スペース。例: spaces/AAAAAAAAAAA
  SPACE_NAME: 'spaces/ここにスペースID',

  CHAT_SHEET: 'ChatMessages',
  CATALOG_SHEET: 'Catalog',

  TIMEZONE: 'Asia/Tokyo',
  OVERLAP_MINUTES: 30,
  LAST_SYNC_PROPERTY: 'LAST_CHAT_SYNC_AT',

  // 個人配信設定用WebアプリのURL。
  // 同じApps Scriptプロジェクトを「アクセスしているユーザーとして実行」で
  // 別デプロイし、その /exec URL を設定する。
  SUBSCRIPTION_WEB_APP_URL: 'ここに個人配信設定用WebアプリURL',

  // 個人トリガーの実行時間帯。Apps Scriptの時間主導トリガーなので、
  // 指定時刻ちょうどではなく、この時間帯の中で実行される。
  DAILY_DISCOVERY_HOUR: 8
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
