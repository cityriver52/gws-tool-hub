# GWS Tool Hub Newsletter

GWS Tool Hub本体から分離した、個人トリガー方式の毎日配信用Apps Scriptです。

## 役割

- 元のGWS Tool Hubスプレッドシートにはアクセスしない
- 第2スプレッドシートの `DailyDiscovery` だけを読む
- 利用者本人が購読すると、その本人所有の時間主導トリガーを1つ作成する
- 毎日、本人から本人宛てに「今日の発見」3件をメールする
- 配信停止時は本人所有の配信トリガーだけを削除する
- 購読者一覧は持たない

## 第2スプレッドシート

本体 `NewsletterExport.gs` が `DailyDiscovery` を作成・更新します。

| 日付 | 種別 | スレッドID | タイトル | 紹介文 | タグ | Chat URL |
|---|---|---|---|---|---|---|

Catalog全体やChat本文はNewsletter側へコピーしません。

## ファイル構成

- `Config.gs` — 第2スプレッドシートID、シート名、配信時間帯
- `Common.gs` — 列マップ、タグ解析、HTMLエスケープ、本人メール取得
- `NewsletterRepository.gs` — 本日のDailyDiscovery取得
- `PersonalSubscription.gs` — 購読状態、個人トリガー作成・削除、配信実行
- `MailRenderer.gs` — プレーンテキスト/HTMLメール生成
- `WebApp.gs` — 設定画面入口
- `Subscription.html` — 購読/解除UI
- `appsscript.json` — OAuthスコープ

## セットアップ

1. 本体とは別にメルマガ専用スプレッドシートを作成する。
2. そのスプレッドシートを購読対象の組織内ユーザーが閲覧できるようにする。
3. 新しいApps Scriptプロジェクトを作成し、この `newsletter/` 配下のファイルを配置する。
4. `Config.gs` の `NEWSLETTER_SPREADSHEET_ID` に第2スプレッドシートIDを設定する。
5. Webアプリとして「アクセスしているユーザーとして実行」でデプロイする。
6. アクセス範囲を購読対象の組織内ユーザーにする。
7. その `/exec` URLを本体 `Config.gs` の `SUBSCRIPTION_WEB_APP_URL` に設定する。
8. 本体で `syncNewsletterData()` を実行し、第2スプレッドシートに `DailyDiscovery` ができることを確認する。

`DAILY_DISCOVERY_HOUR` の初期値は `8` です。時間主導トリガーなので8:00ちょうどではなく8時台に実行されます。

## 実行フロー

```text
Hubの「毎日受け取る」
        ↓
Newsletter Webアプリ
        ↓ 初回のみOAuth承認
本人所有の時間主導トリガー作成
        ↓ 毎日
DailyDiscoveryを読み取り
        ↓
本人 → 本人へメール
```

購読状態は、本人がこのNewsletter Apps Scriptプロジェクトに持つ `sendMyDailyDiscovery` トリガーの有無だけで管理します。

## OAuth権限

Newsletterプロジェクトは次だけを要求します。

- 第2スプレッドシートの読み取り
- 自分の時間主導トリガーの作成・削除
- 自分からメール送信
- 自分のメールアドレス取得

Google Chatや元のGWS Tool Hubスプレッドシートへのアクセス権限は要求しません。
