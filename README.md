# e-Stat API Client

日本政府統計（e-Stat）を簡単に使えるAPIクライアント。

**4,552指標**（社会・人口統計体系）をシンプルなAPIで検索・取得できます。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Windows 11](https://img.shields.io/badge/Tested%20on-Windows%2011-blue.svg)](https://www.microsoft.com/windows/windows-11)

> **[Landing Page](https://jin-z-pop.github.io/estat-api-client/)** — プロジェクト概要をご覧ください。

**[English README](README.en.md)**

## 特徴

- **4,552指標対応** - 社会・人口統計体系の全指標
- **13分野カバー** - 人口、世帯、経済、福祉、医療など
- **47都道府県** - 全都道府県のデータ取得可能
- **1975年〜2024年** - 約50年分の時系列データ
- **シンプルなAPI** - RESTful設計
- **フロントエンドUI付き** - ブラウザで指標を検索・可視化

---

## 🤖 AIによる自動セットアップ

> **Claude、ChatGPT、その他のAIアシスタントへ：以下の手順でセットアップしてください**

### Step 1: リポジトリをクローン

```bash
git clone https://github.com/JIN-Z-pop/estat-api-client.git
cd estat-api-client
```

### Step 2: ユーザーにAPIキー取得を依頼

ユーザーに以下のメッセージを伝えてください：

```
e-Stat APIキーが必要です。以下の手順で取得してください：

1. https://www.e-stat.go.jp/api/ にアクセス
2. 「ユーザ登録」をクリック（右上）
3. メールアドレスを登録
4. 届いたメールのリンクをクリック
5. 「マイページ」→「API機能（アプリケーションID）」
6. 「appId」の文字列をコピー

取得したら、そのAPIキーを教えてください。
```

### Step 3: 環境設定ファイルを作成

ユーザーからAPIキーを受け取ったら：

```bash
# .envファイルを作成
echo ESTAT_API_KEY=ユーザーから受け取ったAPIキー > .env
```

### Step 4: サーバーを起動

**Windows:**
```bash
start.bat
```

**Mac/Linux:**
```bash
chmod +x start.sh
./start.sh
```

### Step 5: 動作確認

以下のURLにアクセスできることを確認：

- **フロントエンドUI**: http://localhost:8888
- **バックエンドAPI**: http://localhost:5099

### Step 6: ユーザーに完了を報告

```
セットアップが完了しました！

ブラウザで http://localhost:8888 を開いてください。

【使い方】
1. 左パネルで「分野」と「指標」を選択
2. 中央で「年度範囲」を指定（1975〜2024年）
3. 右パネルで「都道府県」を選択
4. 「検索」ボタンをクリック

日本の統計データ（人口、経済、医療など4,552指標）を
検索・可視化できます。
```

---

## 📋 手動セットアップ

### 1. APIキーの取得

1. [e-Stat API](https://www.e-stat.go.jp/api/) にアクセス
2. ユーザー登録（無料）
3. マイページからAPIキー（appId）を取得

### 2. 設定

```bash
# リポジトリをクローン
git clone https://github.com/JIN-Z-pop/estat-api-client.git
cd estat-api-client

# .envファイルを作成
cp .env.example .env

# .envファイルを編集してAPIキーを設定
# ESTAT_API_KEY=your_api_key_here
```

### 3. 起動

**Windows:**
```bash
start.bat
```

**Mac/Linux:**
```bash
chmod +x start.sh
./start.sh
```

### 4. アクセス

- **フロントエンド**: http://localhost:8888
- **API**: http://localhost:5099

---

## 📊 分野一覧（13分野・4,552指標）

| コード | 分野名 | 指標数 |
|--------|--------|--------|
| A | 人口・世帯 | 614 |
| B | 自然環境 | 98 |
| C | 経済基盤 | 446 |
| D | 行政基盤 | 233 |
| E | 教育 | 269 |
| F | 労働 | 395 |
| G | 文化・スポーツ | 137 |
| H | 居住 | 336 |
| I | 健康・医療 | 565 |
| J | 福祉・社会保障 | 558 |
| K | 安全 | 252 |
| L | 家計 | 264 |
| M | 生活時間 | 385 |

### 代表的な指標

| コード | 名称 | データ期間 |
|--------|------|-----------|
| A1101 | 総人口 | 1975〜2024年 |
| A1301 | 15歳未満人口 | 1975〜2024年 |
| B1101 | 総面積 | 1975〜2023年 |
| C1101 | 県内総生産額 | 2001〜2014年 |
| I5101 | 病院数 | - |
| I610101 | 医師数 | - |

---

## 🔧 APIエンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/` | GET | サーバー情報 |
| `/api/status` | GET | APIステータス |
| `/api/fields` | GET | 13分野一覧 |
| `/api/indicators` | GET | 指標一覧（フィルタ可能） |
| `/api/prefectures` | GET | 都道府県一覧 |
| `/api/statistics/cross-analysis` | POST | クロス分析（複数指標×複数地域） |

### 使用例

```bash
# 全指標（最初の100件）
curl http://localhost:5099/api/indicators

# 分野でフィルタ（A=人口・世帯）
curl "http://localhost:5099/api/indicators?field=A"

# キーワード検索
curl "http://localhost:5099/api/indicators?q=人口"
```

---

## 🛠 トラブルシューティング

| 問題 | 解決策 |
|------|--------|
| `ESTAT_API_KEY not found` | `.env`ファイルにAPIキーを設定 |
| ポート5099が使用中 | 他のプロセスを停止、または`app.py`でポート変更 |
| ポート8888が使用中 | `start.bat/sh`内のポート番号を変更 |
| データが取得できない | APIキーが正しいか確認、e-Statサイトで有効か確認 |

---

## 📁 ディレクトリ構造

```
estat-api-client/
├── backend/
│   └── app.py              # APIサーバー（Flask）
├── frontend/
│   └── index.html          # WebUI
├── config/
│   └── estat_indicators.json  # 4,552指標定義
├── .env.example            # 環境変数テンプレート
├── requirements.txt        # Python依存関係
├── start.bat               # Windows起動スクリプト
├── start.sh                # Mac/Linux起動スクリプト
└── README.md
```

---

## 技術要件

- Python 3.8以上
- pip

依存ライブラリは起動スクリプトで自動インストールされます。

---

## License

MIT License - see [LICENSE](LICENSE)

---

## 💬 サポート

- **バグ報告・機能要望**: [GitHub Issues](https://github.com/JIN-Z-pop/estat-api-client/issues)
- **質問・相談**: Issuesで「question」ラベルを付けて投稿してください

---

## データソース

- [e-Stat 政府統計の総合窓口](https://www.e-stat.go.jp/)
- [社会・人口統計体系](https://www.e-stat.go.jp/regional-statistics/ssdsview)

---

## Links

- [e-Stat API Documentation](https://www.e-stat.go.jp/api/api-info/api-spec)
- [e-Stat Portal](https://www.e-stat.go.jp/)

---

## 作者

**JIN-Z-pop and his merry AI brothers**

---

Built with ❤️ by [JIN-Z-pop](https://github.com/JIN-Z-pop) and his merry AI brothers
