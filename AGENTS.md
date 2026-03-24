# AGENTS.md

## 目的
このリポジトリでは、パックマンクローンを段階的に実装する。
最優先事項は「既存のファイル構成と責務分離を維持したまま実装すること」。

---

## 作業の基本ルール

- 既存のファイル構成を維持すること
- 既存ファイルの責務を壊さないこと
- 不要な新規ファイルを追加しないこと
- 勝手に別アーキテクチャへ変更しないこと
- 変更は常に最小単位で行うこと
- マイルストーン単位で実装を止めること
- 実装前に編集対象ファイルを宣言すること
- 実装後に変更ファイル一覧と役割を報告すること

---

## 固定ファイル構成

この構成を維持すること。

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

新規ファイル追加は禁止。
明示的に必要な場合のみ提案し、勝手に追加しないこと。

---

## ファイル責務ルール

### src/main.js
- 初期化
- 各モジュールの接続
- ゲームループ管理
- 状態遷移の起点管理

### src/game/GameEngine.js
- ゲーム状態更新のみ担当
- 座標更新
- 衝突判定
- スコア管理
- ゲームオーバー判定
- 描画処理を書かない
- 音再生処理を書かない

### src/game/Renderer.js
- 描画のみ担当
- Canvas などへの描画処理
- 見た目の演出
- 当たり判定やゲーム進行ロジックを書かない

### src/input/InputManager.js
- 入力取得のみ担当
- キー入力の状態管理
- 入力イベントの収集
- ゲーム状態変更を書かない

### src/replay/ReplayRecorder.js
- 入力ログの保存のみ担当
- frame 単位のイベント記録
- JSON export
- ゲームロジックを書かない

### src/replay/ReplayPlayer.js
- 入力ログの再生のみ担当
- frame 一致イベントの取り出し
- 生入力の代替入力供給
- ゲームロジックを書かない

### src/audio/AudioSyncManager.js
- 音と拍の時間管理のみ担当
- Web Audio API の開始時刻管理
- beat / beat progress 計算
- ゲーム状態更新を書かない

### src/data/map.js
- マップ定義のみ
- 迷路レイアウト
- 初期配置データ
- ロジックを書かない

---

## 禁止事項

以下は禁止。

- Renderer で当たり判定を書く
- Renderer でスコア更新を書く
- GameEngine で描画する
- GameEngine で音再生する
- InputManager でゲーム状態を変更する
- Replay 系でゲーム状態を直接変更する
- AudioSyncManager で演出内容を決定する
- main.js に全ロジックを集約する
- TypeScript 化する
- React / Vue / Svelte 等のフレームワークを導入する
- Vite / Webpack / Parcel 等のビルドツールを導入する
- 状態管理ライブラリを導入する
- ランダム挙動を無計画に入れる
- ファイル統合で責務を曖昧にする
- 大規模リファクタを先に行う

---

## 実装方針

- ゲームは frame 基準で動かす
- update 順は `input -> update -> collision -> render` を維持する
- リプレイは frame 単位の入力ログで実装する
- 音同期は Web Audio API の現在時刻 + BPM ベースで実装する
- 音同期はまず演出だけに使う
- ゲーム性変更は後回し
- 乱数は使わない
- 乱数が必要になった場合は seed 固定を前提に提案する
- ゴースト挙動は deterministic にする
- まずは再現性を最優先する

---

## ゲーム状態

最低限、以下の状態を維持すること。

- title
- playing
- replay
- gameover

この状態を破綻させないこと。

---

## リプレイ仕様

- 記録対象は入力イベントのみ
- frame 基準で記録する
- playing 中のみ記録する
- replay 中は生入力を無効化する
- 同一初期状態では同じ結果を再現できること
- JSON ダウンロード可能にする

記録形式の想定:

```json
[
  { "frame": 12, "type": "keydown", "key": "ArrowRight" },
  { "frame": 25, "type": "keydown", "key": "ArrowDown" }
]
