# AGENTS.md

## このリポジトリの実装ルール

- 既存のファイル構成を維持すること
- 新規ファイルは、明示的に必要な場合のみ追加すること
- ファイルの責務は以下を厳守すること

### ディレクトリ構成

- /src/main.js
- /src/game/GameEngine.js
- /src/game/Renderer.js
- /src/input/InputManager.js
- /src/replay/ReplayRecorder.js
- /src/replay/ReplayPlayer.js
- /src/audio/AudioSyncManager.js
- /src/data/map.js
- /assets/bgm.mp3
- /index.html
- /style.css

### 責務ルール

- GameEngine: 状態更新のみ。描画禁止
- Renderer: 描画のみ。ロジック禁止
- InputManager: 入力取得のみ
- ReplayRecorder / ReplayPlayer: 入力の保存と再生のみ
- AudioSyncManager: 時間と拍の計算のみ
- map.js: マップ定義のみ
- main.js: 初期化と各モジュール接続のみ

### 禁止事項

- Rendererで当たり判定を書かない
- GameEngineで音再生を書かない
- InputManagerでゲーム状態変更を書かない
- ファイルの統合や責務の混在をしない
- 勝手に別アーキテクチャへ変更しない
- TypeScript化、フレームワーク導入、ビルドツール導入をしない

### 実装方針

- ゲームは frame 基準で動かす
- リプレイは frame 単位の入力ログで実装する
- 音同期は Web Audio API の現在時刻 + BPM ベースで実装する
- 乱数は使わない。使う場合は seed 固定
- まずは演出同期のみで、ゲーム性は変えない

### 進め方

- まず M1 を完成させる
- 変更は最小限にする
- 各ステップ完了時に、変更したファイル一覧と役割を報告する
- 実装前に、どのファイルを編集するか宣言する
- 既存構成を壊す提案はしない
