# -*- coding: utf-8 -*-
"""
e-Stat API から全指標を取得するスクリプト

社会・人口統計体系の13分野から全指標のメタデータを取得し、
config/estat_indicators.json を更新する。

Usage:
    python scripts/fetch_all_indicators.py
"""

import os
import json
import requests
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict

# e-Stat API設定
API_BASE = "https://api.e-stat.go.jp/rest/3.0/app/json"

# 13分野のstatsDataId（都道府県データ）
FIELD_STATS_IDS = {
    "A": {"id": "0000010101", "name": "人口・世帯", "name_en": "Population & Households"},
    "B": {"id": "0000010102", "name": "自然環境", "name_en": "Natural Environment"},
    "C": {"id": "0000010103", "name": "経済基盤", "name_en": "Economic Base"},
    "D": {"id": "0000010104", "name": "行政基盤", "name_en": "Administrative Base"},
    "E": {"id": "0000010105", "name": "教育", "name_en": "Education"},
    "F": {"id": "0000010106", "name": "労働", "name_en": "Labor"},
    "G": {"id": "0000010107", "name": "文化・スポーツ", "name_en": "Culture & Sports"},
    "H": {"id": "0000010108", "name": "居住", "name_en": "Housing"},
    "I": {"id": "0000010109", "name": "健康・医療", "name_en": "Health & Medical"},
    "J": {"id": "0000010110", "name": "福祉・社会保障", "name_en": "Welfare & Social Security"},
    "K": {"id": "0000010111", "name": "安全", "name_en": "Safety"},
    "L": {"id": "0000010112", "name": "家計", "name_en": "Household Economy"},
    "M": {"id": "0000010113", "name": "生活時間", "name_en": "Time Use"},
}


def get_api_key() -> str:
    """環境変数またはファイルからAPIキーを取得"""
    # 環境変数から
    api_key = os.environ.get("ESTAT_API_KEY")
    if api_key:
        return api_key

    # .envファイルから
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("ESTAT_API_KEY="):
                    return line.strip().split("=", 1)[1].strip('"\'')

    raise ValueError("ESTAT_API_KEY not found. Set environment variable or create .env file.")


def fetch_meta_info(stats_data_id: str, api_key: str) -> Dict[str, Any]:
    """指定されたstatsDataIdのメタデータを取得"""
    url = f"{API_BASE}/getMetaInfo"
    params = {
        "appId": api_key,
        "statsDataId": stats_data_id,
        "lang": "J"
    }

    response = requests.get(url, params=params)
    response.raise_for_status()

    data = response.json()

    if "GET_META_INFO" not in data:
        raise ValueError(f"Unexpected response format for {stats_data_id}")

    return data["GET_META_INFO"]


def extract_indicators(meta_info: Dict[str, Any], field_code: str) -> List[Dict[str, Any]]:
    """メタデータから指標情報を抽出"""
    indicators = []

    # CLASS_INF から cat01 (指標分類) を探す
    class_inf = meta_info.get("METADATA_INF", {}).get("CLASS_INF", {})
    class_obj = class_inf.get("CLASS_OBJ", [])

    if not isinstance(class_obj, list):
        class_obj = [class_obj]

    for cls in class_obj:
        if cls.get("@id") == "cat01":
            # 指標一覧
            class_items = cls.get("CLASS", [])
            if not isinstance(class_items, list):
                class_items = [class_items]

            for item in class_items:
                code = item.get("@code", "")
                name = item.get("@name", "")
                level = item.get("@level", "1")
                unit = item.get("@unit", "")

                # 分野コードで始まる指標のみ（例：A分野なら Aで始まるコード）
                if code.startswith(field_code):
                    indicators.append({
                        "cdCat01": code,
                        "name": name,
                        "name_ja": name,
                        "unit": unit if unit else "-",
                        "level": level,
                        "field": field_code
                    })

    return indicators


def main():
    """メイン処理"""
    print("=" * 60)
    print("e-Stat 全指標取得スクリプト")
    print("=" * 60)

    try:
        api_key = get_api_key()
        print(f"API Key: {api_key[:8]}...")
    except ValueError as e:
        print(f"Error: {e}")
        return

    all_indicators = {}
    field_counts = {}
    total_count = 0

    # 各分野からメタデータを取得
    for field_code, field_info in FIELD_STATS_IDS.items():
        stats_id = field_info["id"]
        field_name = field_info["name"]

        print(f"\n[{field_code}] {field_name} (statsDataId: {stats_id})")

        try:
            meta_info = fetch_meta_info(stats_id, api_key)
            indicators = extract_indicators(meta_info, field_code)

            for ind in indicators:
                # キーはcdCat01コード
                key = ind["cdCat01"]
                all_indicators[key] = ind

            field_counts[field_code] = len(indicators)
            total_count += len(indicators)
            print(f"  → {len(indicators)} 指標を取得")

        except Exception as e:
            print(f"  → Error: {e}")
            field_counts[field_code] = 0

    print("\n" + "=" * 60)
    print(f"総指標数: {total_count}")
    print("=" * 60)

    # 分野別カウント表示
    print("\n分野別指標数:")
    for field_code, count in field_counts.items():
        field_name = FIELD_STATS_IDS[field_code]["name"]
        print(f"  {field_code}: {field_name} - {count}件")

    # JSON出力用データ構築
    output = {
        "_metadata": {
            "version": "2.0.0",
            "created": "2026-01-23",
            "source": "e-Stat API getMetaInfo",
            "description": f"社会・人口統計体系 全{total_count}指標（13分野）",
            "usage": "Use statsDataId + cdCat01 to fetch prefectural data"
        },
        "stats_data_id": {
            "prefecture": {code: info["id"] for code, info in FIELD_STATS_IDS.items()},
            "municipality": {code: f"00000102{i+1:02d}" for i, code in enumerate(FIELD_STATS_IDS.keys())}
        },
        "fields": {
            code: {
                "name": info["name_en"],
                "name_ja": info["name"],
                "count": field_counts.get(code, 0)
            }
            for code, info in FIELD_STATS_IDS.items()
        },
        "indicators": all_indicators
    }

    # 保存
    output_path = Path(__file__).parent.parent / "config" / "estat_indicators_full.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n保存完了: {output_path}")
    print(f"指標数: {len(all_indicators)}")


if __name__ == "__main__":
    main()
