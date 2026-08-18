# GWS Tool Hub Newsletter

GWS Tool Hub本体から切り出した、個人トリガー方式の毎日配信用Apps Scriptです。

## 役割

- 元のGWS Tool Hubスプレッドシートにはアクセスしない
- 本体が第2スプレッドシートへ書き出した `DailyDiscovery` だけを読む
- 利用者本人が「毎日受け取る」を押したとき、その本人所有の時間主導トリガーを1つ作る
- 毎日、本人から本人宛てに「今日の発見」3件をメールする
- 配信停止時は本人所有の配信トリガーだけを削除する
- 購読者一覧は持たない

## 第2スプレッドシート

本体の `NewsletterExport.gs` が以下の2シートを作成・更新します。

### NewsletterCatalog

| スレッドID | 親投稿ID | 初回投稿日 | 最終更新日時 | タイトル | 紹介文 | タグ | Chat URL |
|---|---|---|---|---|---|---|---|

### DailyDiscovery

| 日付 | 種別 | スレッドID | タイトル | 紹介文 | タグ | Chat URL |
|---|---|---|---|---|---|---|

個人配信では `DailyDiscovery` だけを読みます。

## セットアップ

1. メルマガ専用の第2スプレッドシートを作る。
2. 第2スプレッドシートを、購読対象の組織内ユーザーが閲覧できるようにする。元のGWS Tool Hubスプレッドシートは共有しない。
3. 新しいApps Scriptプロジェクトを作成し、この `newsletter/` 配下のファイルを配置する。
4. `newsletter/Config.gs` の `NEWSLETTER_SPREADSHEET_ID` に第2スプレッドシートIDを設定する。
5. Webアプリとして「アクセスしているユーザーとして実行」でデプロイし、アクセス範囲を組織内ユーザーにする。
6. その `/exec` URLを本体 `Config.gs` の `SUBSCRIPTION_WEB_APP_URL` に設定する。
7. 本体 `Config.gs` の `NEWSLETTER_SPREADSHEET_ID` にも同じ第2スプレッドシートIDを設定する。
8. 本体で `syncNewsletterData()` を一度実行し、`NewsletterCatalog` と `DailyDiscovery` が作られることを確認する。

`DAILY_DISCOVERY_HOUR` の初期値は `8` です。Apps Scriptの時間主導トリガーなので、8:00ちょうどではなく8時台に実行されます。

## OAuth権限

個人配信プロジェクトは次だけを要求します。

- 第2スプレッドシートの読み取り
- 自分の時間主導トリガーの作成・削除
- 自分からメール送信
- 自分のメールアドレス取得

Google Chatや元のGWS Tool Hubスプレッドシートへのアクセス権限は要求しません。
