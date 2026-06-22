🌐 **日本語** | [English](./README.en.md)

# Talkmsg Viewer

ダウンロードした [colmsg](https://github.com/proshunsuke/colmsg) のトークメッセージを閲覧するためのローカルWebビューア。

---
## アプリプレビュー

| ホーム画面 | チャット画面 | メディアギャラリー |
| :--- | :--- | :--- |
| <img src="https://github.com/user-attachments/assets/6a92de4d-2c88-4911-8b4d-3166d3f02443" width="100%"> | <img src="https://github.com/user-attachments/assets/54702dae-5c44-4d65-acbc-75578709a830" width="100%"> | <img src="https://github.com/user-attachments/assets/50f9f91d-e4b0-4f14-ba0e-fa11b9789c19" width="100%"> |

---

## 機能

- **カレンダージャンプ**: 任意の月に素早く移動し、その月以降に送信されたメッセージを表示できます。
- **メディアギャラリー**: メンバーから送信されたすべての画像や動画を、専用のギャラリービューで一覧表示・閲覧できます。
- **お気に入り**: 気に入ったメッセージをお気に入りに登録し、後からまとめて確認できます。

---

## 動作環境

| ツール | 最小バージョン |
|-----------|----------------|
| **Node.js** | v18 以降   |
| **npm**     | v9 以降    |

### Node.js & npm のインストール

#### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install nodejs npm
```

#### Linux (Fedora)
```bash
sudo dnf install nodejs npm
```

#### Windows
1. Node.js のインストーラーをダウンロードします： https://nodejs.org/ja/download
2. インストーラーを実行し、指示に従ってインストールします（npm も同時にインストールされます）。

インストール完了後、以下のコマンドで動作確認を行います：
```bash
node -v
npm -v
```

---

## セットアップ

### 1. リポジトリをクローンする

```bash
git clone https://github.com/akumaru1/talkmsg-viewer.git
cd talkmsg-viewer
```

### 2. 依存関係のインストール

```bash
npm run setup
```

### 3. メディアディレクトリの設定

自動生成された `.env` ファイルを開き、`MEDIA_DIR` に `colmsg` フォルダのパスを設定します。
また、`ONLINE_MEMBERS` や `YOUR_NAME` も追加・カスタマイズできます。

```env
MEDIA_DIR=/path/to/colmsg
PORT=3001
ONLINE_MEMBERS=一ノ瀬美空,井上和,奥田いろは,田村真佑
YOUR_NAME=あなた
```

**パスの指定例：**

- Linux/macOS: `MEDIA_DIR=/home/yourname/Downloads/colmsg`
- Windows: `MEDIA_DIR=C:\Users\yourname\Downloads\colmsg`

### 3a. (任意) メンバーのアイコン画像を追加する

メンバーのフォルダに画像ファイルを配置することで、プロフィールアイコンを表示させることができます：

```
colmsg/
├── 乃木坂46
│   └── 一ノ瀬美空
│       ├── avatar.png
│       └── xxxxxx.jpg
```

### 4. アプリケーションの起動

```bash
npm run dev
```

ブラウザで **http://localhost:5173** にアクセスします。

> アプリ起動後、画面上の同期（sync）ボタンを押してデータを読み込んでください。
