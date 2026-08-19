# GWS Tool Hub

Google Chatのスペースで共有されたGoogle Workspaceの活用アイデアを自動収集し、スレッド単位で整理・検索する社内向けWebアプリです。

## Architecture

```text
Google Chat
   ↓
ChatSync.gs
   ↓
【非公開: 本体スプレッドシート】
ChatMessages / Catalog
   ↓ Workspace Studio
掲載判定・タイトル・紹介文・タグ
   ↓
CatalogRepository.gs
   ├─ CatalogService.gs → Hub Web UI
   ├─ DailyDiscoveryService.gs → 今日の発見3件
   └─ NewsletterExport.gs → 第2スプレッドシート
                                  ↓
                           【共有: DailyDiscovery】
                                  ↓
                           newsletter/ 別Apps Script
                                  ↓
                      各利用者本人の個人トリガー
                                  ↓
                         本人 → 本人へ毎日メール
```

元スプレッドシートはWorkspace Studio用として非公開のまま維持します。メルマガ側へコピーするのは、その日に配信する3件の表示情報だけです。

## 本体スプレッドシート

### ChatMessages

| 投稿ID | スレッドID | 投稿日 | 更新日時 | 本文 | 取得日時 |
|---|---|---|---|---|---|

### Catalog

| スレッドID | 親投稿ID | 初回投稿日 | 最終更新日時 | AI処理用本文 | タイトル | 紹介文 | タグ | 掲載判定 | AI処理状態 |
|---|---|---|---|---|---|---|---|---|---|

原文は `ChatMessages` にだけ保持します。Catalogの `AI処理用本文` は、スレッド全文からURLを除去したWorkspace Studio向けテキストです。

## 今日の発見

`DailyDiscoveryService.gs` が掲載済みCatalogから毎日3件を決定します。

1. 「ちょっと前から」 — 最終更新日時の新しい順で最新3件を除外し、その次の最大27件（4〜30件目）から日付seedで1件
2. 「かなり前から」 — 残りの中から、初回投稿日が古い半分を候補にして日付seedで1件
3. 「今日のランダム」 — 1・2件目を除いた残りから日付seedで1件

Web表示とメルマガ書き出しは同じ `getTodaysDiscovery_()` を使うため、同じ日の3件は一致します。

## メルマガ用第2スプレッドシート

第2スプレッドシートには `DailyDiscovery` だけを作成します。

| 日付 | 種別 | スレッドID | タイトル | 紹介文 | タグ | Chat URL |
|---|---|---|---|---|---|---|

Catalog全体、Chat本文、`AI処理用本文`、Workspace Studio管理列はコピーしません。

`runScheduledSync()` / `runFullSync()` の最後で `trySyncNewsletterData_()` が呼ばれます。第2スプレッドシートが未設定・一時エラーでも、本体のChat同期は失敗させません。手動同期は `syncNewsletterData()` です。

## 責務分離

### 本体

- `Config.gs` — 設定・ヘッダー定義
- `Common.gs` — 汎用ヘルパー
- `ChatSync.gs` — Chat取得と同期パイプライン
- `CatalogBuilder.gs` — ChatMessagesからCatalogを構築
- `CatalogRepository.gs` — 掲載済みCatalogの読み取り・行→オブジェクト変換
- `CatalogService.gs` — Web UI用レスポンス生成
- `DailyDiscoveryService.gs` — 日替わり3件の選定
- `NewsletterExport.gs` — DailyDiscoveryを第2スプレッドシートへ書き出し
- `ChatLink.gs` — Google Chatリンク生成
- `WebApp.gs` — Hub Webアプリ入口
- `Index.html` / `JavaScript.html` — UI
- `Stylesheet.html` / `DiscoveryStyles.html` / `SearchPanelStyles.html` / `CardDetails.html` — 表示
- `workspace-studio-prompts.md` — Workspace Studio用プロンプト

### Newsletter別プロジェクト

`newsletter/` 配下を別Apps Scriptプロジェクトとして配置します。

- `Config.gs` — Newsletter設定
- `Common.gs` — 共通ヘルパー
- `NewsletterRepository.gs` — DailyDiscovery読み取り
- `PersonalSubscription.gs` — 個人トリガー作成・削除・配信実行
- `MailRenderer.gs` — テキスト/HTMLメール生成
- `WebApp.gs` / `Subscription.html` — 購読設定UI
- `appsscript.json` — 最小OAuthスコープ

## 初期設定

1. 元スプレッドシートに `ChatMessages` と `Catalog` を用意する。
2. 本体Apps Scriptへルート直下の本体ファイルを配置する。
3. `Config.gs` の `SPACE_NAME` を設定する。
4. Workspace StudioをCatalogに接続する。
5. メルマガ用の第2スプレッドシートを新規作成する。
6. 第2スプレッドシートを購読対象の組織内ユーザーが閲覧できるようにする。元スプレッドシートは共有しない。
7. 本体 `Config.gs` の `NEWSLETTER_SPREADSHEET_ID` に第2スプレッドシートIDを設定する。
8. `newsletter/` 配下を新しいApps Scriptプロジェクトへ配置し、`newsletter/Config.gs` に同じIDを設定する。
9. Newsletterアプリを「アクセスしているユーザーとして実行」でWebアプリとしてデプロイする。
10. Newsletterの `/exec` URLを本体 `SUBSCRIPTION_WEB_APP_URL` に設定する。
11. 本体Hubをデプロイする。
12. 本体で `syncNewsletterData()` を一度実行し、`DailyDiscovery` が作成されることを確認する。
13. `runScheduledSync()` を10分程度、`runFullSync()` を1日1回程度の時間主導トリガーに設定する。

## OAuth

本体は別スプレッドシートへ書き込むため `https://www.googleapis.com/auth/spreadsheets` を使用します。

Newsletterアプリは第2スプレッドシートの読み取り、本人のトリガー管理、メール送信、本人メールアドレス取得だけを要求します。Google Chatや元スプレッドシートへの権限は持ちません。

## Notes

- Google Chat `messages.list` は `createTime` で差分取得できますが `lastUpdateTime` では絞り込めないため、古い編集を拾う目的で定期的な全件同期も行います。
- Catalogは新規スレッドだけ末尾へ追加し、既存スレッドは同じ行を更新します。
- `ChatLink.gs` は `https://chat.google.com/room/{spaceId}/{threadId}/{messageId}?cls=10` 形式を生成します。
- GitHubとコンテナバインドApps Scriptは自動同期されません。
