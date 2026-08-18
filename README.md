# GWS Tool Hub

Google Chatのスペースに投稿されたGoogle Workspaceの活用アイデアを自動収集し、スレッド単位で整理・検索できる社内向けWebアプリです。

## 主な機能

- Google Chatの投稿を定期取得
- 投稿IDによる重複取込防止
- スレッド単位で返信を結合
- Workspace Studioによる掲載判定・タイトル・紹介文・タグ生成
- 掲載済みアイデアのキーワード検索・タグ絞り込み
- 「今日の発見」3件を日替わり表示
- 希望者だけが別のNewsletterアプリで毎日メールを受信
- 元になったGoogle Chatの親投稿へ直接移動

## 全体構成

```text
Google Chat
   ↓
【非公開: GWS Tool Hub本体スプレッドシート】
ChatMessages / Catalog
   ↓ Workspace Studio
掲載判定・タイトル・紹介文・タグ
   ↓ NewsletterExport.gs
【第2スプレッドシート】
NewsletterCatalog / DailyDiscovery
   ↓
【別Apps Script: newsletter/】
各利用者の個人トリガー
   ↓
本人 → 本人 へ毎日メール
```

元スプレッドシートはWorkspace Studio用として非公開のまま維持します。購読者へ共有するのは第2スプレッドシートだけです。

## 本体スプレッドシート

### ChatMessages

| 投稿ID | スレッドID | 投稿日 | 更新日時 | 本文 | 取得日時 |
|---|---|---|---|---|---|

### Catalog

| スレッドID | 親投稿ID | 初回投稿日 | 最終更新日時 | AI処理用本文 | タイトル | 紹介文 | タグ | 掲載判定 | AI処理状態 |
|---|---|---|---|---|---|---|---|---|---|

原文は `ChatMessages` に保持し、Catalogには重複保存しません。`AI処理用本文` はGASがスレッド全文を組み立てたうえでURLを `[リンク省略]` に置き換えたテキストです。

## 今日の発見

`DailyDiscoveryService.gs` で、その日の3件をサーバー側で決定します。

1. 最終更新日時が最も新しい「新着から1件」
2. 古い半分から日付seedで選ぶ「掘り起こし」
3. 残りから日付seedで選ぶ「今日のランダム」

Webアプリは `getTodaysDiscovery_()` の結果を表示します。

## メルマガ用データの分離

`NewsletterExport.gs` が、掲載済みデータのうちメール配信に必要な情報だけを第2スプレッドシートへ同期します。

第2スプレッドシートには以下の2シートを作成します。

### NewsletterCatalog

| スレッドID | 親投稿ID | 初回投稿日 | 最終更新日時 | タイトル | 紹介文 | タグ | Chat URL |
|---|---|---|---|---|---|---|---|

### DailyDiscovery

| 日付 | 種別 | スレッドID | タイトル | 紹介文 | タグ | Chat URL |
|---|---|---|---|---|---|---|

元のChat本文、`AI処理用本文`、掲載判定、AI処理状態などは第2スプレッドシートへコピーしません。

`runScheduledSync()` と `runFullSync()` の最後で `trySyncNewsletterData_()` を呼ぶため、メルマガ用データも定期的に更新されます。第2スプレッドシートが未設定または一時的にエラーでも、Google Chat同期自体は継続します。

手動で同期したい場合は `syncNewsletterData()` を実行できます。

## Newsletterアプリ

個人配信機能は本体Apps Scriptから完全に分離し、`newsletter/` 配下を別Apps Scriptプロジェクトとして配置します。

Newsletterアプリは:

- 元のGWS Tool Hubスプレッドシートへアクセスしない
- 第2スプレッドシートの `DailyDiscovery` だけを読む
- 利用者本人の個人トリガーを作成・削除する
- 本人から本人宛てに毎日メールする
- 購読者一覧を持たない

詳細は [`newsletter/README.md`](newsletter/README.md) を参照してください。

## ファイル構成

### GWS Tool Hub本体

- `Config.gs`: 設定・シート定義・第2スプレッドシート設定
- `Common.gs`: 共通関数
- `ChatSync.gs`: Google Chat取得・差分同期
- `CatalogBuilder.gs`: スレッド単位のCatalog生成・末尾追記・AI用本文生成
- `CatalogService.gs`: Web表示用データ取得
- `DailyDiscoveryService.gs`: 今日の発見3件の選定
- `NewsletterExport.gs`: 第2スプレッドシートへの公開用データ同期
- `WebApp.gs`: Hub本体Webアプリ入口
- `ChatLink.gs`: Google Chatの親投稿へのリンク生成
- `Index.html`: 画面構造
- `Stylesheet.html` / `DiscoveryStyles.html` / `SearchPanelStyles.html`: CSS
- `CardDetails.html`: カード本文の折りたたみ・展開
- `JavaScript.html`: クライアント側処理
- `appsscript.json`: 本体マニフェスト
- `workspace-studio-prompts.md`: Workspace Studio用プロンプト

### Newsletter別プロジェクト

`newsletter/` 配下を別Apps Scriptへ配置します。

## 初期設定

1. 元スプレッドシートに `ChatMessages` と `Catalog` を用意する。
2. 本体Apps Scriptにルート直下の本体ファイルを配置する。
3. `Config.gs` の `SPACE_NAME` を設定する。
4. Workspace StudioをCatalogに接続する。
5. メルマガ用の第2スプレッドシートを新規作成する。
6. 第2スプレッドシートを購読対象の組織内ユーザーが閲覧できるようにする。元スプレッドシートは共有しない。
7. 本体 `Config.gs` の `NEWSLETTER_SPREADSHEET_ID` に第2スプレッドシートIDを設定する。
8. `newsletter/` 配下を新しいApps Scriptプロジェクトへ配置し、`newsletter/Config.gs` に同じ第2スプレッドシートIDを設定する。
9. Newsletterアプリを「アクセスしているユーザーとして実行」でWebアプリとしてデプロイする。
10. その `/exec` URLを本体 `CONFIG.SUBSCRIPTION_WEB_APP_URL` に設定する。
11. 本体Hubを通常どおりデプロイする。
12. 本体で `syncNewsletterData()` を一度実行し、第2スプレッドシートに2シートが作られることを確認する。
13. `runScheduledSync()` を10分程度、`runFullSync()` を1日1回程度の時間主導トリガーに設定する。

## OAuth権限

本体は第2スプレッドシートへ書き込むため、Spreadsheet権限は `spreadsheets.currentonly` ではなく `spreadsheets` を使用します。

Newsletterアプリは最小限の権限だけを要求し、Google Chat権限や元スプレッドシートの権限は持ちません。

## 注意点

- Google Chat `messages.list` は `createTime` で差分取得できますが、`lastUpdateTime` では絞り込めません。そのため、古い投稿の編集反映用に定期的な全件同期を行います。
- Catalogは毎回全件を書き直さず、新規スレッドをシート末尾へ追加します。
- `AI処理用本文` はURLだけを除去し、リンクの表示名がある場合は表示名を残します。
- 元投稿の全文は `ChatMessages` または元のGoogle Chat投稿で確認できます。
- `ChatLink.gs` は `https://chat.google.com/room/{spaceId}/{threadId}/{messageId}?cls=10` を生成します。
