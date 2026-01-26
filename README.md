# e-Stat API Client

日本政府統計（e-Stat）を簡単に使えるAPIクライアント。

**4,552指標**（社会・人口統計体系）をシンプルなAPIで検索・取得できます。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)

## 特徴

- **4,552指標対応** - 社会・人口統計体系の全指標
- **13分野カバー** - 人口、世帯、経済、福祉、医療など
- **47都道府県** - 全都道府県のデータ取得可能
- **シンプルなAPI** - RESTful設計
- **ワンクリック起動** - start.bat/start.shで即座に利用開始
- **フロントエンドUI付き** - ブラウザで指標を検索・可視化

## クイックスタート

### 1. APIキーの取得

1. [e-Stat API](https://www.e-stat.go.jp/api/) にアクセス
2. ユーザー登録（無料）
3. APIキーを取得

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

- **フロントエンド**: http://localhost:8080
- **API**: http://localhost:5099

## APIエンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/` | GET | サーバー情報 |
| `/api/status` | GET | APIステータス |
| `/api/fields` | GET | 13分野一覧 |
| `/api/indicators` | GET | 指標一覧（フィルタ可能） |
| `/api/prefectures` | GET | 都道府県一覧 |
| `/api/search` | POST | データ検索 |

### 指標一覧の取得

```bash
# 全指標（最初の100件）
curl http://localhost:5099/api/indicators

# 分野でフィルタ（A=人口・世帯）
curl "http://localhost:5099/api/indicators?field=A"

# キーワード検索
curl "http://localhost:5099/api/indicators?q=人口"

# ページネーション
curl "http://localhost:5099/api/indicators?limit=50&offset=100"
```

### データ検索

```bash
curl -X POST http://localhost:5099/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "indicators": ["A1101", "A1301"],
    "areas": ["13", "27"],
    "years": [2020, 2021]
  }'
```

## 分野一覧（13分野・4,552指標）

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

| コード | 名称 |
|--------|------|
| A1101 | 総人口 |
| A1301 | 15歳未満人口 |
| C120110 | 県内総生産額 |
| I5101 | 病院数 |
| I610101 | 医師数 |
| K4201 | 刑法犯認知件数 |

詳細は [`config/estat_indicators.json`](config/estat_indicators.json) を参照。

## Web UI

フロントエンドUIで指標を検索・可視化できます。

### 機能

- **指標検索** - キーワード・分野で4,552指標を検索
- **データ表示** - 都道府県別データをテーブル表示
- **チャート** - 棒グラフ・円グラフで可視化
- **エクスポート** - CSV/Excel形式でダウンロード

## ディレクトリ構造

```
estat-api-client/
├── backend/
│   └── app.py              # APIサーバー（Flask）
├── frontend/
│   ├── index.html          # WebUI
│   └── config/
│       └── estat_indicators.json
├── config/
│   └── estat_indicators.json  # 4,552指標定義
├── .env.example            # 環境変数テンプレート
├── requirements.txt        # Python依存関係
├── start.bat               # Windows起動スクリプト
├── start.sh                # Mac/Linux起動スクリプト
└── README.md
```

## 開発

```bash
# 仮想環境作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係インストール
pip install -r requirements.txt

# バックエンド起動（開発モード）
cd backend
python app.py

# フロントエンド起動（別ターミナル）
cd frontend
python -m http.server 8080
```

## 技術要件

- Python 3.8以上
- pip

依存ライブラリは起動スクリプトで自動インストールされます。

## Contributing

コントリビュート歓迎です！

1. リポジトリをフォーク
2. フィーチャーブランチを作成
3. プルリクエストを送信

## License

MIT License - see [LICENSE](LICENSE)

## データソース

- [e-Stat 政府統計の総合窓口](https://www.e-stat.go.jp/)
- [社会・人口統計体系](https://www.e-stat.go.jp/regional-statistics/ssdsview)

## 謝辞

本プロジェクトは日本政府統計（e-Stat）のAPIを利用しています。

Built with ❤️

## Links

- [e-Stat API Documentation](https://www.e-stat.go.jp/api/api-info/api-spec)
- [e-Stat Portal](https://www.e-stat.go.jp/)
