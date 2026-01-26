# -*- coding: utf-8 -*-
"""
市区町村マスタデータ取得スクリプト

e-Stat APIから全国の市区町村コード・名称を取得し、
config/municipalities.json に保存する。

Usage:
    python scripts/fetch_municipalities.py

Output:
    config/municipalities.json (約1,700件)
"""

import json
import os
import sys
import requests
from pathlib import Path
from datetime import datetime

# プロジェクトルートを追加
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# 設定
ESTAT_API_BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'

# 都道府県マスタ
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


def get_api_key():
    """環境変数または.envファイルからAPIキーを取得"""
    api_key = os.environ.get('ESTAT_API_KEY')
    if api_key:
        return api_key

    env_path = PROJECT_ROOT / '.env'
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('ESTAT_API_KEY='):
                    return line.split('=', 1)[1].strip('"\'')
    return None


def get_meta_info(api_key: str, stats_data_id: str) -> dict:
    """統計表のメタ情報を取得"""
    url = f"{ESTAT_API_BASE}/getMetaInfo"
    params = {
        'appId': api_key,
        'statsDataId': stats_data_id,
        'lang': 'J'
    }

    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()
    return response.json()


def extract_area_codes(meta_response: dict) -> list:
    """メタ情報から地域コード一覧を抽出"""
    areas = []

    try:
        class_inf = meta_response.get('GET_META_INFO', {}).get('METADATA_INF', {}).get('CLASS_INF', {}).get('CLASS_OBJ', [])

        for class_obj in class_inf:
            class_id = class_obj.get('@id', '')

            if class_id == 'area':
                classes = class_obj.get('CLASS', [])
                if not isinstance(classes, list):
                    classes = [classes]

                for cls in classes:
                    code = cls.get('@code', '')
                    name = cls.get('@name', '')
                    level = cls.get('@level', '')

                    if code and name:
                        areas.append({
                            'code': code,
                            'name': name,
                            'level': level
                        })
    except Exception as e:
        print(f"Error extracting area codes: {e}")

    return areas


def classify_municipality(code: str, name: str) -> str:
    """市区町村の種別を判定"""
    # コードの形式で判定
    if len(code) == 5:
        pref_code = code[:2]
        city_code = code[2:]

        # 000 = 都道府県レベル
        if city_code == '000':
            return 'prefecture'

        # 政令指定都市の区（100番台）
        if city_code[0] == '1' and city_code[1] != '0':
            return 'ward'

        # 名前で判定
        if name.endswith('区') and not name.endswith('市'):
            # 東京23区 or 政令市の区
            return 'ward'
        elif name.endswith('市'):
            return 'city'
        elif name.endswith('町'):
            return 'town'
        elif name.endswith('村'):
            return 'village'

    return 'other'


def fetch_municipalities(api_key: str) -> list:
    """
    e-Stat APIから市区町村一覧を取得

    社会・人口統計体系の市区町村別データから地域コードを取得
    """
    print("Fetching municipality data from e-Stat API...")

    # 市区町村別データを持つ統計表ID
    # 社会・人口統計体系 - 市区町村別データ
    stats_data_id = '0000020106'  # 市区町村別（3800+地域）

    meta_response = get_meta_info(api_key, stats_data_id)
    areas = extract_area_codes(meta_response)

    municipalities = []

    for area in areas:
        code = area['code']
        name = area['name']

        # 5桁コードのみ（市区町村）
        if len(code) != 5:
            continue

        # 都道府県レベル（XXX000）はスキップ
        if code.endswith('000'):
            continue

        pref_code = code[:2]
        pref_name = PREFECTURES.get(pref_code, '')

        if not pref_name:
            continue

        level = classify_municipality(code, name)

        municipalities.append({
            'code': code,
            'name': name,
            'prefecture_code': pref_code,
            'prefecture_name': pref_name,
            'level': level
        })

    # コード順にソート
    municipalities.sort(key=lambda x: x['code'])

    return municipalities


def save_municipalities(municipalities: list):
    """市区町村データをJSONファイルに保存"""
    output_path = PROJECT_ROOT / 'config' / 'municipalities.json'

    # 都道府県別にグループ化
    by_prefecture = {}
    for m in municipalities:
        pref_code = m['prefecture_code']
        if pref_code not in by_prefecture:
            by_prefecture[pref_code] = []
        by_prefecture[pref_code].append(m)

    # 統計情報
    stats = {
        'total': len(municipalities),
        'by_level': {},
        'by_prefecture': {}
    }

    for m in municipalities:
        level = m['level']
        stats['by_level'][level] = stats['by_level'].get(level, 0) + 1

    for pref_code, items in by_prefecture.items():
        stats['by_prefecture'][pref_code] = len(items)

    output_data = {
        'version': '1.0.0',
        'generated_at': datetime.now().isoformat(),
        'source': 'e-Stat API (社会・人口統計体系)',
        'stats': stats,
        'municipalities': municipalities
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\nSaved to: {output_path}")
    print(f"Total municipalities: {stats['total']}")
    print(f"By level: {stats['by_level']}")

    return output_path


def main():
    api_key = get_api_key()

    if not api_key:
        print("Error: ESTAT_API_KEY not found.")
        print("Please set it in .env file or environment variable.")
        sys.exit(1)

    print(f"API Key: {api_key[:8]}...")

    municipalities = fetch_municipalities(api_key)

    if not municipalities:
        print("Error: No municipalities found.")
        sys.exit(1)

    save_municipalities(municipalities)
    print("\nDone!")


if __name__ == '__main__':
    main()
