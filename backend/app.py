# -*- coding: utf-8 -*-
"""
e-Stat API シンプルサーバー

誰でも簡単に使える日本政府統計APIラッパー。
4,552指標（社会・人口統計体系）に対応。

Usage:
    1. .envファイルにESTAT_API_KEYを設定
    2. python app.py
    3. http://localhost:5099 にアクセス

Port: 5099
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
import requests
import logging
from datetime import datetime
from pathlib import Path

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:*", "http://127.0.0.1:*"]}})

def _safe_int(param_name: str, default: int, lo: int = 0, hi: int = 1000) -> int:
    """Parse request arg as int with bounds clamping."""
    try:
        return min(max(int(request.args.get(param_name, default)), lo), hi)
    except (ValueError, TypeError):
        return default

# =============================================================================
# 設定
# =============================================================================

CONFIG = {
    'name': 'e-Stat API Client',
    'version': '1.0.0',
    'port': 5099,
    'estat_api_base': 'https://api.e-stat.go.jp/rest/3.0/app/json'
}

# 指標設定をロード
INDICATORS_CONFIG = None
INDICATORS_PATH = Path(__file__).resolve().parent.parent / 'config' / 'estat_indicators.json'


def load_indicators_config():
    """指標設定JSONをロード"""
    global INDICATORS_CONFIG
    if INDICATORS_CONFIG is None:
        try:
            with open(INDICATORS_PATH, 'r', encoding='utf-8') as f:
                INDICATORS_CONFIG = json.load(f)
            logger.info(f"Loaded {len(INDICATORS_CONFIG.get('indicators', {}))} indicators from config")
        except Exception as e:
            logger.error(f"Failed to load indicators config: {e}")
            INDICATORS_CONFIG = {'indicators': {}, 'fields': {}}
    return INDICATORS_CONFIG


def get_api_key():
    """環境変数または.envファイルからAPIキーを取得"""
    # 環境変数から
    api_key = os.environ.get('ESTAT_API_KEY')
    if api_key:
        return api_key

    # .envファイルから
    env_paths = [
        Path(__file__).parent.parent / '.env',
        Path(__file__).parent / '.env'
    ]

    for env_path in env_paths:
        if env_path.exists():
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('ESTAT_API_KEY='):
                        return line.split('=', 1)[1].strip('"\'')

    return None


# =============================================================================
# e-Stat API クライアント
# =============================================================================

class EStatClient:
    """e-Stat API シンプルクライアント"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = CONFIG['estat_api_base']

    def get_stats_data(self, stats_data_id: str, cd_cat01: str = None,
                       cd_area: str = None, cd_time: str = None) -> dict:
        """
        統計データを取得

        Args:
            stats_data_id: 統計表ID（例: "0000010101"）
            cd_cat01: 指標コード（例: "A1101"）
            cd_area: 地域コード（例: "13" for 東京都）
            cd_time: 時間コード（例: "2020000000"）

        Returns:
            APIレスポンス（JSON）
        """
        url = f"{self.base_url}/getStatsData"
        params = {
            'appId': self.api_key,
            'statsDataId': stats_data_id,
            'metaGetFlg': 'Y',
            'cntGetFlg': 'N'
        }

        if cd_cat01:
            params['cdCat01'] = cd_cat01
        if cd_area:
            params['cdArea'] = cd_area
        if cd_time:
            params['cdTime'] = cd_time

        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"e-Stat API error: {e}")
            return {'error': str(e)}

    def get_meta_info(self, stats_data_id: str) -> dict:
        """統計表のメタ情報を取得"""
        url = f"{self.base_url}/getMetaInfo"
        params = {
            'appId': self.api_key,
            'statsDataId': stats_data_id,
            'lang': 'J'
        }

        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"e-Stat API error: {e}")
            return {'error': str(e)}


# グローバルクライアント
estat_client = None


def get_estat_client():
    """e-Statクライアントを取得（遅延初期化）"""
    global estat_client
    if estat_client is None:
        api_key = get_api_key()
        if api_key:
            estat_client = EStatClient(api_key)
            logger.info("e-Stat client initialized")
        else:
            logger.warning("ESTAT_API_KEY not found")
    return estat_client


# =============================================================================
# APIエンドポイント
# =============================================================================

@app.route('/')
def index():
    """サーバー情報"""
    config = load_indicators_config()
    return jsonify({
        'name': CONFIG['name'],
        'version': CONFIG['version'],
        'status': 'online',
        'api_key_configured': get_api_key() is not None,
        'indicators_count': len(config.get('indicators', {})),
        'fields_count': len(config.get('fields', {})),
        'endpoints': {
            'status': '/api/status',
            'fields': '/api/fields',
            'indicators': '/api/indicators',
            'search': '/api/search (POST)',
            'data': '/api/data (POST)'
        },
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/status')
def api_status():
    """APIステータス確認"""
    config = load_indicators_config()
    client = get_estat_client()

    return jsonify({
        'status': 'online',
        'api_key_configured': client is not None,
        'indicators_count': len(config.get('indicators', {})),
        'fields_count': len(config.get('fields', {})),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/fields')
def get_fields():
    """13分野一覧を取得"""
    config = load_indicators_config()
    fields = config.get('fields', {})

    result = []
    for code, info in sorted(fields.items()):
        result.append({
            'code': code,
            'name': info.get('name', ''),
            'name_ja': info.get('name_ja', ''),
            'count': info.get('count', 0)
        })

    return jsonify({
        'status': 'success',
        'fields': result,
        'total': len(result),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/indicators')
def get_indicators():
    """指標一覧を取得"""
    config = load_indicators_config()
    indicators = config.get('indicators', {})

    # フィルタリング
    field = request.args.get('field')  # 分野でフィルタ
    keyword = request.args.get('q', '').lower()  # キーワード検索
    limit = _safe_int('limit', 100, 1, 1000)
    offset = _safe_int('offset', 0, 0, 100000)

    result = []
    for cd_cat01, info in indicators.items():
        # 分野フィルタ
        if field and info.get('field') != field:
            continue

        # キーワードフィルタ
        if keyword:
            name = info.get('name', '').lower()
            name_ja = info.get('name_ja', '').lower()
            if keyword not in name and keyword not in name_ja and keyword not in cd_cat01.lower():
                continue

        result.append({
            'cdCat01': cd_cat01,
            'name': info.get('name', ''),
            'name_ja': info.get('name_ja', ''),
            'unit': info.get('unit', ''),
            'field': info.get('field', ''),
            'level': info.get('level', '1')
        })

    # ソート（cdCat01順）
    result.sort(key=lambda x: x['cdCat01'])

    # ページネーション
    total = len(result)
    result = result[offset:offset + limit]

    return jsonify({
        'status': 'success',
        'indicators': result,
        'total': total,
        'limit': limit,
        'offset': offset,
        'filter': {
            'field': field,
            'keyword': keyword
        },
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/search', methods=['POST'])
def search_data():
    """
    統計データを検索

    POST Body:
    {
        "indicators": ["A1101", "A1301"],  // cdCat01コード
        "areas": ["13", "27", "14"],       // 都道府県コード（省略可）
        "years": [2020, 2021, 2022]        // 年度（省略可）
    }
    """
    client = get_estat_client()
    if not client:
        return jsonify({
            'status': 'error',
            'error': 'ESTAT_API_KEY not configured. Please set it in .env file.'
        }), 500

    data = request.get_json() or {}
    indicators = data.get('indicators', [])
    areas = data.get('areas', [])
    years = data.get('years', [])

    if not indicators:
        return jsonify({
            'status': 'error',
            'error': 'indicators parameter is required'
        }), 400

    config = load_indicators_config()
    all_indicators = config.get('indicators', {})
    stats_data_ids = config.get('stats_data_id', {}).get('prefecture', {})

    results = {}
    errors = []

    for indicator_code in indicators:
        # 指標情報を取得
        indicator_info = all_indicators.get(indicator_code)
        if not indicator_info:
            errors.append(f"Unknown indicator: {indicator_code}")
            continue

        field = indicator_info.get('field', 'A')
        stats_data_id = stats_data_ids.get(field, '0000010101')

        # エリアコード構築（都道府県は2桁→5桁に変換）
        cd_area = None
        if areas:
            # 複数エリアの場合はカンマ区切り
            area_codes = [f"{a.zfill(2)}000" for a in areas]
            cd_area = ','.join(area_codes)

        # データ取得
        try:
            api_response = client.get_stats_data(
                stats_data_id=stats_data_id,
                cd_cat01=indicator_code,
                cd_area=cd_area
            )

            if 'error' in api_response:
                errors.append(f"{indicator_code}: {api_response['error']}")
                continue

            # レスポンスをパース
            parsed_data = parse_estat_response(api_response, indicator_code, years)
            results[indicator_code] = {
                'info': indicator_info,
                'data': parsed_data
            }

        except Exception as e:
            logger.error(f"Error fetching {indicator_code}: {e}")
            errors.append(f"{indicator_code}: {str(e)}")

    return jsonify({
        'status': 'success' if results else 'error',
        'results': results,
        'errors': errors,
        'query': {
            'indicators': indicators,
            'areas': areas,
            'years': years
        },
        'timestamp': datetime.now().isoformat()
    })


def parse_estat_response(response: dict, indicator_code: str, year_filter: list = None) -> list:
    """
    e-Stat APIレスポンスをパースしてシンプルなデータ構造に変換

    Returns:
        [
            {'area': '13', 'area_name': '東京都', 'year': 2020, 'value': 13960000},
            ...
        ]
    """
    results = []

    try:
        stat_data = response.get('GET_STATS_DATA', {})
        data_inf = stat_data.get('STATISTICAL_DATA', {}).get('DATA_INF', {})

        # メタ情報からエリア名・年度を取得
        class_inf = stat_data.get('STATISTICAL_DATA', {}).get('CLASS_INF', {}).get('CLASS_OBJ', [])

        area_map = {}
        time_map = {}

        for class_obj in class_inf:
            class_id = class_obj.get('@id', '')
            classes = class_obj.get('CLASS', [])
            if not isinstance(classes, list):
                classes = [classes]

            if class_id == 'area':
                for cls in classes:
                    area_map[cls.get('@code', '')] = cls.get('@name', '')
            elif class_id == 'time':
                for cls in classes:
                    code = cls.get('@code', '')
                    name = cls.get('@name', '')
                    # 年度を抽出（例: "2020年度" → 2020）
                    try:
                        year = int(name.replace('年度', '').replace('年', ''))
                        time_map[code] = year
                    except:
                        time_map[code] = name

        # データを変換
        values = data_inf.get('VALUE', [])
        if not isinstance(values, list):
            values = [values]

        for value in values:
            area_code = value.get('@area', '')
            time_code = value.get('@time', '')
            val = value.get('$', '')

            # 値を数値に変換
            try:
                if val == '-' or val == '…' or val == 'x' or val == '':
                    continue
                numeric_val = float(val.replace(',', ''))
            except:
                continue

            year = time_map.get(time_code, time_code)

            # 年度フィルタ
            if year_filter and isinstance(year, int) and year not in year_filter:
                continue

            results.append({
                'area': area_code[:2],  # 都道府県コード（2桁）
                'area_name': area_map.get(area_code, area_code),
                'year': year,
                'value': numeric_val
            })

    except Exception as e:
        logger.error(f"Error parsing response: {e}")

    # 年度・エリアでソート
    results.sort(key=lambda x: (x.get('area', ''), x.get('year', 0)))

    return results


@app.route('/api/data', methods=['POST'])
def get_data():
    """search APIのエイリアス（互換性のため）"""
    return search_data()


@app.route('/api/statistics/cross-analysis', methods=['POST', 'OPTIONS'])
def cross_analysis():
    """
    クロス分析API

    POST Body:
    {
        "indicators": ["A1101", "A1301"],  // cdCat01コード
        "year_from": 2020,
        "year_to": 2023,
        "regions": ["13", "27", "14"]      // 都道府県コード
    }

    Response:
    {
        "status": "success",
        "results": {
            "13": {
                "region_name": "東京都",
                "data": {
                    "A1101": {
                        "name": "総人口",
                        "data": [{"year": 2020, "value": 12345}, ...]
                    }
                }
            }
        }
    }
    """
    # OPTIONSリクエスト（プリフライト）への対応
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response

    client = get_estat_client()
    if not client:
        return jsonify({
            'status': 'error',
            'error': 'ESTAT_API_KEY not configured. Please set it in .env file.'
        }), 500

    data = request.get_json() or {}
    indicators = data.get('indicators', [])
    year_from = data.get('year_from')
    year_to = data.get('year_to')
    regions = data.get('regions', [])

    if not indicators:
        return jsonify({
            'status': 'error',
            'error': 'indicators parameter is required'
        }), 400

    # 年度リストを生成
    years = []
    if year_from and year_to:
        years = list(range(int(year_from), int(year_to) + 1))

    config = load_indicators_config()
    all_indicators = config.get('indicators', {})
    stats_data_ids = config.get('stats_data_id', {}).get('prefecture', {})

    # 結果を地域ベースで構築
    results = {}
    errors = []

    for indicator_code in indicators:
        # 指標情報を取得
        indicator_info = all_indicators.get(indicator_code)
        if not indicator_info:
            errors.append(f"Unknown indicator: {indicator_code}")
            continue

        field = indicator_info.get('field', 'A')
        stats_data_id = stats_data_ids.get(field, '0000010101')

        # エリアコード構築（都道府県は2桁→5桁に変換）
        cd_area = None
        if regions:
            area_codes = [f"{r.zfill(2)}000" for r in regions]
            cd_area = ','.join(area_codes)

        # データ取得
        try:
            api_response = client.get_stats_data(
                stats_data_id=stats_data_id,
                cd_cat01=indicator_code,
                cd_area=cd_area
            )

            if 'error' in api_response:
                errors.append(f"{indicator_code}: {api_response['error']}")
                continue

            # レスポンスをパース
            parsed_data = parse_estat_response(api_response, indicator_code, years if years else None)

            # 地域ベースで結果を整理
            for item in parsed_data:
                region_code = item['area']
                region_name = item['area_name']

                if region_code not in results:
                    results[region_code] = {
                        'region_name': region_name,
                        'data': {}
                    }

                if indicator_code not in results[region_code]['data']:
                    results[region_code]['data'][indicator_code] = {
                        'name': indicator_info.get('name_ja', indicator_info.get('name', '')),
                        'unit': indicator_info.get('unit', ''),
                        'data': []
                    }

                results[region_code]['data'][indicator_code]['data'].append({
                    'year': item['year'],
                    'value': item['value']
                })

        except Exception as e:
            logger.error(f"Error fetching {indicator_code}: {e}")
            errors.append(f"{indicator_code}: {str(e)}")

    return jsonify({
        'status': 'success' if results else 'error',
        'results': results,
        'errors': errors,
        'query': {
            'indicators': indicators,
            'year_from': year_from,
            'year_to': year_to,
            'regions': regions
        },
        'timestamp': datetime.now().isoformat()
    })


# =============================================================================
# 都道府県マスター
# =============================================================================

PREFECTURES = {
    '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県', '05': '秋田県',
    '06': '山形県', '07': '福島県', '08': '茨城県', '09': '栃木県', '10': '群馬県',
    '11': '埼玉県', '12': '千葉県', '13': '東京都', '14': '神奈川県', '15': '新潟県',
    '16': '富山県', '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
    '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県', '25': '滋賀県',
    '26': '京都府', '27': '大阪府', '28': '兵庫県', '29': '奈良県', '30': '和歌山県',
    '31': '鳥取県', '32': '島根県', '33': '岡山県', '34': '広島県', '35': '山口県',
    '36': '徳島県', '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
    '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県', '45': '宮崎県',
    '46': '鹿児島県', '47': '沖縄県'
}

@app.route('/api/prefectures')
def get_prefectures():
    """都道府県一覧を取得"""
    result = [{'code': code, 'name': name} for code, name in sorted(PREFECTURES.items())]
    return jsonify({
        'status': 'success',
        'prefectures': result,
        'total': len(result)
    })


# =============================================================================
# 市区町村マスター
# =============================================================================

MUNICIPALITIES_CONFIG = None
MUNICIPALITIES_PATH = Path(__file__).parent.parent / 'config' / 'municipalities.json'


def load_municipalities_config():
    """市区町村設定JSONをロード"""
    global MUNICIPALITIES_CONFIG
    if MUNICIPALITIES_CONFIG is None:
        try:
            with open(MUNICIPALITIES_PATH, 'r', encoding='utf-8') as f:
                MUNICIPALITIES_CONFIG = json.load(f)
            logger.info(f"Loaded {MUNICIPALITIES_CONFIG.get('stats', {}).get('total', 0)} municipalities from config")
        except Exception as e:
            logger.error(f"Failed to load municipalities config: {e}")
            MUNICIPALITIES_CONFIG = {'municipalities': [], 'stats': {'total': 0}}
    return MUNICIPALITIES_CONFIG


@app.route('/api/prefectures/<pref_code>/municipalities')
def get_municipalities_by_prefecture(pref_code: str):
    """都道府県内の市区町村一覧を取得"""
    # 都道府県コードを2桁に正規化
    pref_code = pref_code.zfill(2)

    if pref_code not in PREFECTURES:
        return jsonify({
            'status': 'error',
            'error': f'Unknown prefecture code: {pref_code}'
        }), 404

    config = load_municipalities_config()
    municipalities = config.get('municipalities', [])

    # 都道府県でフィルタ
    result = [
        {
            'code': m['code'],
            'name': m['name'],
            'level': m['level']
        }
        for m in municipalities
        if m.get('prefecture_code') == pref_code
    ]

    return jsonify({
        'status': 'success',
        'prefecture': {
            'code': pref_code,
            'name': PREFECTURES[pref_code]
        },
        'municipalities': result,
        'total': len(result)
    })


@app.route('/api/municipalities/search')
def search_municipalities():
    """市区町村を検索"""
    query = request.args.get('q', '').strip()
    limit = _safe_int('limit', 50, 1, 500)

    if not query:
        return jsonify({
            'status': 'error',
            'error': 'Query parameter "q" is required'
        }), 400

    config = load_municipalities_config()
    municipalities = config.get('municipalities', [])

    # 検索（部分一致）
    query_lower = query.lower()
    result = []

    for m in municipalities:
        name = m.get('name', '')
        pref_name = m.get('prefecture_name', '')

        # 市区町村名または都道府県名+市区町村名で検索
        if query_lower in name.lower() or query_lower in (pref_name + name).lower():
            result.append({
                'code': m['code'],
                'name': m['name'],
                'prefecture_code': m['prefecture_code'],
                'prefecture_name': m['prefecture_name'],
                'level': m['level']
            })

            if len(result) >= limit:
                break

    return jsonify({
        'status': 'success',
        'query': query,
        'municipalities': result,
        'total': len(result),
        'limit': limit
    })


@app.route('/api/municipalities')
def get_all_municipalities():
    """全市区町村一覧を取得（ページネーション対応）"""
    limit = _safe_int('limit', 100, 1, 1000)
    offset = _safe_int('offset', 0, 0, 100000)
    pref_code = request.args.get('prefecture')
    level = request.args.get('level')

    config = load_municipalities_config()
    municipalities = config.get('municipalities', [])

    # フィルタリング
    result = []
    for m in municipalities:
        if pref_code and m.get('prefecture_code') != pref_code.zfill(2):
            continue
        if level and m.get('level') != level:
            continue
        result.append({
            'code': m['code'],
            'name': m['name'],
            'prefecture_code': m['prefecture_code'],
            'prefecture_name': m['prefecture_name'],
            'level': m['level']
        })

    total = len(result)
    result = result[offset:offset + limit]

    return jsonify({
        'status': 'success',
        'municipalities': result,
        'total': total,
        'limit': limit,
        'offset': offset,
        'filter': {
            'prefecture': pref_code,
            'level': level
        }
    })


# =============================================================================
# エラーハンドラー
# =============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'status': 'error',
        'error': 'Internal server error'
    }), 500


# =============================================================================
# メイン
# =============================================================================

if __name__ == '__main__':
    config = load_indicators_config()
    api_key = get_api_key()

    print(f"""
+--------------------------------------------------------------+
|  e-Stat API Client Server                                    |
+--------------------------------------------------------------+
|  Version: {CONFIG['version']}                                         |
|  Port: {CONFIG['port']}                                              |
|  Indicators: {len(config.get('indicators', {})):,} indicators                            |
|  API Key: {'[OK] Configured' if api_key else '[NG] Not configured (set ESTAT_API_KEY)'}            |
+--------------------------------------------------------------+
|  Access: http://localhost:{CONFIG['port']}                            |
+--------------------------------------------------------------+
    """)

    if not api_key:
        print("[WARNING] ESTAT_API_KEY not found. Set it in .env file.")
        print("  Get your API key at: https://www.e-stat.go.jp/api/")
        print()

    app.run(
        host=os.environ.get('FLASK_HOST', '127.0.0.1'),
        port=CONFIG['port'],
        debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    )
