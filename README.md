# GWS Tool Hub

Google Chatのスペースに投稿されたGoogle Workspaceの活用アイデアを自動収集し、スレッド単位で整理・検索できる社内向けWebアプリです。

## 主な機能

- Google Chatの投稿を定期取得
- 投稿IDによる重複取込防止
- スレッド単位で返信を結合
- Workspace Studioによる掲載判定・タイトル・紹介文・タグ生成を想定
- 掲載済みアイデアのキーワード検索
- タグ絞り込み
- 「使ってます」人数の表示と登録／解除
- 利用者のメールアドレスは内部IDとしてのみ保存し、Web画面には表示しない

## スプレッドシート構成

### ChatMessages

| 投稿ID | スレッドID | 投稿日 | 更新日時 | 本文 | 取得日時 |
|---|---|---|---|---|---|

### Catalog

| スレッドID | 親投稿ID | 初回投稿日 | 最終更新日時 | スレッド本文 | タイトル | 紹介文 | タグ | 掲載判定 | AI処理状態 | AI処理日時 |
|---|---|---|---|---|---|---|---|---|---|---|

### Usage

| スレッドID | ユーザーID | 登録日時 |
|---|---|---|

`ユーザーID`には組織内ユーザーのメールアドレスを保存します。Webクライアントにはメールアドレスを返しません。

## ファイル構成

- `Config.gs`: 設定・シート定義
- `Common.gs`: 共通関数
- `ChatSync.gs`: Google Chat取得・差分同期
- `CatalogBuilder.gs`: スレッド単位のCatalog生成
- `WebApp.gs`: Webアプリ入口
- `CatalogService.gs`: Web表示用データ取得
- `ChatLink.gs`: Google Chatリンク生成
- `UsageService.gs`: 「使ってます」登録・解除
- `Index.html`: 画面構造
- `Stylesheet.html`: CSS
- `JavaScript.html`: クライアント側処理
- `appsscript.json`: Apps Scriptマニフェスト
- `workspace-studio-prompts.md`: Workspace Studio用プロンプト

## 初期設定

1. スプレッドシートに上記3シートとヘッダーを作成する。
2. コンテナバインドApps Scriptに各ファイルを配置する。
3. `Config.gs` の `SPACE_NAME` を対象スペースのリソース名に変更する。
4. Google CloudプロジェクトでGoogle Chat APIを有効化する。
5. `runFullSync()` を一度手動実行する。
6. `runScheduledSync()` を10分程度の時間主導トリガーに設定する。
7. 古い投稿の編集も拾うため、`runFullSync()` を1日1回程度実行する。
8. Workspace Studioで `AI処理状態 = 未処理 / 要再処理` のCatalog行を処理する。
9. Webアプリとしてデプロイする。

## Webアプリの実行設定

組織内限定で利用します。

`Session.getActiveUser().getEmail()` を利用して「使ってます」の内部ユーザーIDを取得します。同一Google Workspaceドメインでは「デプロイしたユーザーとして実行」でも取得できる場合があります。環境で空文字になる場合はWebアプリの実行方式を見直してください。

## 注意点

- Google Chat `messages.list` は `createTime` で差分取得できますが、`lastUpdateTime` では絞り込めません。そのため、古い投稿の編集反映用に定期的な全件同期を行います。
- `ChatLink.gs` は現在、個別メッセージではなく対象スペースを開くURLを生成します。個別permalinkの生成方式を確定した場合は、このファイルだけ差し替えられます。
