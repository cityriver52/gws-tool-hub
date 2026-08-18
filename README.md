# GWS Tool Hub

Google Chatのスペースに投稿されたGoogle Workspaceの活用アイデアを自動収集し、スレッド単位で整理・検索できる社内向けWebアプリです。

## 主な機能

- Google Chatの投稿を定期取得
- 投稿IDによる重複取込防止
- スレッド単位で返信を結合
- Workspace Studioによる掲載判定・タイトル・紹介文・タグ生成を想定
- 掲載済みアイデアのキーワード検索
- タグ絞り込み
- 元になったGoogle Chatの親投稿へ直接移動

## スプレッドシート構成

### ChatMessages

| 投稿ID | スレッドID | 投稿日 | 更新日時 | 本文 | 取得日時 |
|---|---|---|---|---|---|

### Catalog

| スレッドID | 親投稿ID | 初回投稿日 | 最終更新日時 | AI処理用本文 | タイトル | 紹介文 | タグ | 掲載判定 | AI処理状態 |
|---|---|---|---|---|---|---|---|---|---|

原文は `ChatMessages` に保持し、Catalogには重複保存しません。`AI処理用本文` はGASがスレッド全文を組み立てたうえでURLを `[リンク省略]` に置き換えたテキストです。Workspace StudioとWebアプリの検索はこの列を使用します。

Catalogは新しいスレッドをシート末尾へ追記します。既存スレッドに返信や編集があった場合は、そのスレッドの既存行を更新します。シート上の行順はWebアプリの表示順には使用せず、Web側で `最終更新日時` の新しい順に並べ替えます。

`AI処理日時` は使用しません。Workspace Studioでは現在時刻を取得する前提を置かず、処理状況は `AI処理状態` のみで管理します。

## ファイル構成

- `Config.gs`: 設定・シート定義
- `Common.gs`: 共通関数
- `ChatSync.gs`: Google Chat取得・差分同期
- `CatalogBuilder.gs`: スレッド単位のCatalog生成・末尾追記・AI用本文生成
- `WebApp.gs`: Webアプリ入口
- `CatalogService.gs`: Web表示用データ取得
- `ChatLink.gs`: Google Chatの親投稿へのリンク生成
- `Index.html`: 画面構造
- `Stylesheet.html`: CSS
- `DiscoveryStyles.html`: 「今日の発見」用CSS
- `SearchPanelStyles.html`: 検索エリア用CSS
- `CardDetails.html`: カード本文の折りたたみ・展開
- `JavaScript.html`: クライアント側処理
- `appsscript.json`: Apps Scriptマニフェスト
- `workspace-studio-prompts.md`: Workspace Studio用プロンプト

## 初期設定

1. スプレッドシートに `ChatMessages` と `Catalog` シートを作成し、上記ヘッダーを設定する。
2. コンテナバインドApps Scriptに各ファイルを配置する。
3. `Config.gs` の `SPACE_NAME` を対象スペースのリソース名に変更する。
4. `runFullSync()` を一度手動実行する。
5. `runScheduledSync()` を10分程度の時間主導トリガーに設定する。
6. 古い投稿の編集も拾うため、`runFullSync()` を1日1回程度実行する。
7. Workspace Studioで `AI処理状態 = 未処理 / 要再処理` のCatalog行を処理する。AI入力には `AI処理用本文` を指定する。
8. 処理完了時は `AI処理状態 = 処理済` に更新する。
9. Webアプリとしてデプロイする。

Google Chatの取得はApps Script自身のOAuthトークンを利用します。APIキー、サービスアカウント、自前のGoogle Cloudプロジェクトでの認証情報管理は前提としていません。

## 注意点

- Google Chat `messages.list` は `createTime` で差分取得できますが、`lastUpdateTime` では絞り込めません。そのため、古い投稿の編集反映用に定期的な全件同期を行います。
- Catalogは毎回全件を書き直さず、新規スレッドを `appendRow()` で末尾に追加します。既存スレッドのAI生成列は保持し、元投稿に変更があった場合のみA〜E列と `AI処理状態` を更新します。
- `AI処理用本文` はURLだけを除去し、MarkdownリンクやChat形式のリンクに表示名がある場合は表示名を残します。
- 元投稿の全文は `ChatMessages` または元のGoogle Chat投稿で確認できます。
- `ChatLink.gs` はGoogle Chatのコピーリンク形式に合わせ、`https://chat.google.com/room/{spaceId}/{threadId}/{messageId}?cls=10` を生成します。
- Workspace Studioの紹介文生成では、URLやハイパーリンク文字列を出力しないようプロンプトでも制約しています。
