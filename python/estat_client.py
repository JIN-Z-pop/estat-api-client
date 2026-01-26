# -*- coding: utf-8 -*-
"""
e-Stat API Client - Japanese Government Statistics API Client

A Python client for fetching prefectural statistics from e-Stat,
the official Japanese government statistics portal.

Features:
- Direct API calls with requests
- 61 indicators across 13 fields
- Local caching with TTL
- Bilingual support (English/Japanese)
- Multiple output formats (dict, DataFrame, Markdown, CSV)

Example:
    from estat_client import EStatClient

    client = EStatClient(api_key="your-api-key")

    # Fetch by indicator name
    data = client.fetch("population", years=[2020, 2021, 2022])

    # Fetch by cdCat01 code
    data = client.fetch_by_code("A1101", years=[2022])

    # Get as pandas DataFrame
    df = client.to_dataframe(data)

API Key:
    Get your free API key from: https://www.e-stat.go.jp/api/
"""

import os
import json
import hashlib
import requests
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union

__version__ = "1.0.0"
__author__ = "Jin Kim & ClaudeCode"

# Prefecture code mapping
PREFECTURE_CODES = {
    "01000": ("Hokkaido", "北海道"),
    "02000": ("Aomori", "青森県"),
    "03000": ("Iwate", "岩手県"),
    "04000": ("Miyagi", "宮城県"),
    "05000": ("Akita", "秋田県"),
    "06000": ("Yamagata", "山形県"),
    "07000": ("Fukushima", "福島県"),
    "08000": ("Ibaraki", "茨城県"),
    "09000": ("Tochigi", "栃木県"),
    "10000": ("Gunma", "群馬県"),
    "11000": ("Saitama", "埼玉県"),
    "12000": ("Chiba", "千葉県"),
    "13000": ("Tokyo", "東京都"),
    "14000": ("Kanagawa", "神奈川県"),
    "15000": ("Niigata", "新潟県"),
    "16000": ("Toyama", "富山県"),
    "17000": ("Ishikawa", "石川県"),
    "18000": ("Fukui", "福井県"),
    "19000": ("Yamanashi", "山梨県"),
    "20000": ("Nagano", "長野県"),
    "21000": ("Gifu", "岐阜県"),
    "22000": ("Shizuoka", "静岡県"),
    "23000": ("Aichi", "愛知県"),
    "24000": ("Mie", "三重県"),
    "25000": ("Shiga", "滋賀県"),
    "26000": ("Kyoto", "京都府"),
    "27000": ("Osaka", "大阪府"),
    "28000": ("Hyogo", "兵庫県"),
    "29000": ("Nara", "奈良県"),
    "30000": ("Wakayama", "和歌山県"),
    "31000": ("Tottori", "鳥取県"),
    "32000": ("Shimane", "島根県"),
    "33000": ("Okayama", "岡山県"),
    "34000": ("Hiroshima", "広島県"),
    "35000": ("Yamaguchi", "山口県"),
    "36000": ("Tokushima", "徳島県"),
    "37000": ("Kagawa", "香川県"),
    "38000": ("Ehime", "愛媛県"),
    "39000": ("Kochi", "高知県"),
    "40000": ("Fukuoka", "福岡県"),
    "41000": ("Saga", "佐賀県"),
    "42000": ("Nagasaki", "長崎県"),
    "43000": ("Kumamoto", "熊本県"),
    "44000": ("Oita", "大分県"),
    "45000": ("Miyazaki", "宮崎県"),
    "46000": ("Kagoshima", "鹿児島県"),
    "47000": ("Okinawa", "沖縄県"),
}


class EStatClientError(Exception):
    """Base exception for EStatClient"""
    pass


class EStatClient:
    """
    e-Stat API Client for Japanese Government Statistics

    Args:
        api_key: e-Stat API key (or set ESTAT_API_KEY env var)
        config_path: Path to indicators config JSON
        cache_dir: Directory for cache files (None to disable)
        cache_ttl_hours: Cache time-to-live in hours (default: 24)
        language: Output language ('en' or 'ja')
        timeout: Request timeout in seconds
    """

    BASE_URL = "https://api.e-stat.go.jp/rest/3.0/app/json"

    def __init__(
        self,
        api_key: Optional[str] = None,
        config_path: Optional[Union[str, Path]] = None,
        cache_dir: Optional[Union[str, Path]] = None,
        cache_ttl_hours: int = 24,
        language: str = "ja",
        timeout: int = 30
    ):
        # API key
        self.api_key = api_key or os.environ.get("ESTAT_API_KEY") or os.environ.get("ESTAT_APP_ID")
        if not self.api_key:
            raise EStatClientError(
                "API key required. Set ESTAT_API_KEY environment variable "
                "or pass api_key parameter.\n"
                "Get your free key at: https://www.e-stat.go.jp/api/"
            )

        # Configuration
        self.language = language
        self.timeout = timeout

        # Load indicator config
        if config_path is None:
            config_path = Path(__file__).parent.parent / "config" / "estat_indicators.json"
        self.config = self._load_config(config_path)

        # Cache setup
        self.cache_enabled = cache_dir is not None
        self.cache_ttl = timedelta(hours=cache_ttl_hours)
        if self.cache_enabled:
            self.cache_dir = Path(cache_dir)
            self.cache_dir.mkdir(parents=True, exist_ok=True)
        else:
            self.cache_dir = None

    def _load_config(self, config_path: Union[str, Path]) -> Dict:
        """Load indicator configuration"""
        config_path = Path(config_path)
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        else:
            # Minimal default config
            return {
                "stats_data_id": {
                    "prefecture": {
                        "A": "0000010101", "B": "0000010102", "C": "0000010103",
                        "D": "0000010104", "E": "0000010105", "F": "0000010106",
                        "G": "0000010107", "H": "0000010108", "I": "0000010109",
                        "J": "0000010110", "K": "0000010111", "L": "0000010112",
                        "M": "0000010113"
                    }
                },
                "indicators": {},
                "fields": {}
            }

    def _get_stats_data_id(self, cd_cat01: str, level: str = "prefecture") -> str:
        """Get statsDataId from cdCat01 code"""
        field = cd_cat01[0].upper()
        return self.config["stats_data_id"].get(level, {}).get(field, "0000010101")

    def _get_cache_key(self, cd_cat01: str, years: Optional[List[int]]) -> str:
        """Generate cache key"""
        key_str = f"{cd_cat01}_{years or 'all'}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def _get_cached(self, cache_key: str) -> Optional[Dict]:
        """Load from cache"""
        if not self.cache_enabled:
            return None

        cache_file = self.cache_dir / f"{cache_key}.json"
        if not cache_file.exists():
            return None

        with open(cache_file, "r", encoding="utf-8") as f:
            cached = json.load(f)

        cached_time = datetime.fromisoformat(cached["cached_at"])
        if datetime.now() - cached_time > self.cache_ttl:
            cache_file.unlink()
            return None

        return cached["data"]

    def _set_cache(self, cache_key: str, data: Dict) -> None:
        """Save to cache"""
        if not self.cache_enabled:
            return

        cache_file = self.cache_dir / f"{cache_key}.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump({
                "cached_at": datetime.now().isoformat(),
                "data": data
            }, f, ensure_ascii=False, indent=2)

    def get_indicator_info(self, indicator: str) -> Optional[Dict]:
        """
        Get indicator information by name or key

        Args:
            indicator: Indicator name, key, or cdCat01 code

        Returns:
            Indicator info dict or None
        """
        indicators = self.config.get("indicators", {})

        # Direct key match
        if indicator in indicators:
            return {"key": indicator, **indicators[indicator]}

        # cdCat01 match
        for key, info in indicators.items():
            if info.get("cdCat01") == indicator:
                return {"key": key, **info}

        # Name match (Japanese or English)
        for key, info in indicators.items():
            if info.get("name") == indicator or info.get("name_ja") == indicator:
                return {"key": key, **info}
            if indicator in info.get("aliases", []):
                return {"key": key, **info}

        return None

    def list_indicators(self, field: Optional[str] = None) -> List[Dict]:
        """
        List available indicators

        Args:
            field: Filter by field code (A-M)

        Returns:
            List of indicator info dicts
        """
        indicators = self.config.get("indicators", {})
        result = []

        for key, info in indicators.items():
            if field and info.get("field") != field:
                continue
            result.append({
                "key": key,
                "cdCat01": info.get("cdCat01"),
                "name": info.get("name"),
                "name_ja": info.get("name_ja"),
                "unit": info.get("unit"),
                "field": info.get("field")
            })

        return result

    def list_fields(self) -> List[Dict]:
        """List available fields"""
        fields = self.config.get("fields", {})
        return [
            {"code": code, **info}
            for code, info in fields.items()
        ]

    def fetch_by_code(
        self,
        cd_cat01: str,
        years: Optional[List[int]] = None,
        use_cache: bool = True,
        level: str = "prefecture"
    ) -> Dict[str, Dict[int, Any]]:
        """
        Fetch data by cdCat01 code

        Args:
            cd_cat01: Indicator code (e.g., "A1101" for population)
            years: List of years to fetch (None for all)
            use_cache: Whether to use cache
            level: "prefecture" or "municipality"

        Returns:
            {prefecture_name: {year: value, ...}, ...}
        """
        # Check cache
        if use_cache:
            cache_key = self._get_cache_key(cd_cat01, years)
            cached = self._get_cached(cache_key)
            if cached:
                return cached

        # Get statsDataId
        stats_data_id = self._get_stats_data_id(cd_cat01, level)

        # API call
        params = {
            "appId": self.api_key,
            "statsDataId": stats_data_id,
            "cdCat01": cd_cat01,
            "limit": 10000
        }

        url = f"{self.BASE_URL}/getStatsData"

        try:
            response = requests.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
        except requests.RequestException as e:
            raise EStatClientError(f"API request failed: {e}")

        result = response.json()

        # Extract data
        data = self._extract_data(result, years)

        # Cache
        if use_cache:
            self._set_cache(cache_key, data)

        return data

    def _extract_data(
        self,
        api_response: Dict,
        years: Optional[List[int]] = None
    ) -> Dict[str, Dict[int, Any]]:
        """Extract data from API response"""
        result = {}

        try:
            stat_data = api_response["GET_STATS_DATA"]["STATISTICAL_DATA"]
            data_inf = stat_data.get("DATA_INF", {})
            values = data_inf.get("VALUE", [])

            if not values:
                return result

            for item in values:
                area_code = item.get("@area", "")
                if area_code not in PREFECTURE_CODES:
                    continue

                # Get prefecture name based on language
                pref_names = PREFECTURE_CODES[area_code]
                pref_name = pref_names[1] if self.language == "ja" else pref_names[0]

                # Extract year
                time_code = item.get("@time", "")
                try:
                    year = int(time_code[:4]) if time_code else None
                except ValueError:
                    continue

                if years and year not in years:
                    continue

                # Extract value
                value = item.get("$", "-")

                # Store
                if pref_name not in result:
                    result[pref_name] = {}
                result[pref_name][year] = value

        except (KeyError, TypeError) as e:
            raise EStatClientError(f"Failed to parse API response: {e}")

        return result

    def fetch(
        self,
        indicator: str,
        years: Optional[List[int]] = None,
        use_cache: bool = True,
        level: str = "prefecture"
    ) -> Dict[str, Dict[int, Any]]:
        """
        Fetch data by indicator name or key

        Args:
            indicator: Indicator name, key, or cdCat01 code
            years: List of years to fetch
            use_cache: Whether to use cache
            level: "prefecture" or "municipality"

        Returns:
            {prefecture_name: {year: value, ...}, ...}
        """
        info = self.get_indicator_info(indicator)
        if not info:
            # Try as direct cdCat01 code
            if len(indicator) >= 2 and indicator[0].isalpha():
                return self.fetch_by_code(indicator, years, use_cache, level)
            raise EStatClientError(f"Unknown indicator: {indicator}")

        return self.fetch_by_code(info["cdCat01"], years, use_cache, level)

    def to_dataframe(self, data: Dict[str, Dict[int, Any]]):
        """
        Convert to pandas DataFrame

        Requires pandas to be installed.
        """
        try:
            import pandas as pd
        except ImportError:
            raise EStatClientError("pandas is required for to_dataframe()")

        rows = []
        for pref, year_data in data.items():
            for year, value in year_data.items():
                rows.append({
                    "prefecture": pref,
                    "year": year,
                    "value": value
                })

        return pd.DataFrame(rows)

    def to_markdown(
        self,
        data: Dict[str, Dict[int, Any]],
        indicator_name: str = "Data",
        cd_cat01: str = ""
    ) -> str:
        """Convert to Markdown table"""
        if not data:
            return f"## {indicator_name}\n\nNo data available.\n"

        # Get years
        all_years = set()
        for pref_data in data.values():
            all_years.update(pref_data.keys())
        years = sorted(all_years)

        # Build table
        lines = [
            f"## {indicator_name}",
            "",
        ]

        if cd_cat01:
            lines.append(f"**cdCat01**: {cd_cat01}")
            lines.append("")

        # Header
        header = "| Prefecture | " + " | ".join(str(y) for y in years) + " |"
        separator = "|" + "---|" * (len(years) + 1)
        lines.extend([header, separator])

        # Sort prefectures
        pref_order = [v[1] if self.language == "ja" else v[0] for v in PREFECTURE_CODES.values()]
        sorted_prefs = sorted(
            data.keys(),
            key=lambda x: pref_order.index(x) if x in pref_order else 999
        )

        # Data rows
        for pref in sorted_prefs:
            pref_data = data[pref]
            row = f"| {pref} |"
            for year in years:
                value = pref_data.get(year, "-")
                row += f" {value} |"
            lines.append(row)

        return "\n".join(lines)

    def to_csv(
        self,
        data: Dict[str, Dict[int, Any]],
        output_path: Optional[Union[str, Path]] = None
    ) -> str:
        """
        Convert to CSV format

        Args:
            data: Data dict
            output_path: Optional file path to save

        Returns:
            CSV string
        """
        if not data:
            return "prefecture,year,value\n"

        lines = ["prefecture,year,value"]
        for pref, year_data in data.items():
            for year, value in year_data.items():
                lines.append(f"{pref},{year},{value}")

        csv_str = "\n".join(lines)

        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(csv_str)

        return csv_str

    def clear_cache(self) -> int:
        """Clear all cache files, returns count"""
        if not self.cache_enabled:
            return 0

        count = 0
        for cache_file in self.cache_dir.glob("*.json"):
            cache_file.unlink()
            count += 1
        return count


# CLI support
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="e-Stat API Client")
    parser.add_argument("indicator", help="Indicator name or cdCat01 code")
    parser.add_argument("--years", "-y", nargs="+", type=int, help="Years to fetch")
    parser.add_argument("--format", "-f", choices=["json", "csv", "markdown"], default="json")
    parser.add_argument("--language", "-l", choices=["en", "ja"], default="ja")
    parser.add_argument("--output", "-o", help="Output file path")

    args = parser.parse_args()

    client = EStatClient(language=args.language)
    data = client.fetch(args.indicator, years=args.years)

    if args.format == "json":
        output = json.dumps(data, ensure_ascii=False, indent=2)
    elif args.format == "csv":
        output = client.to_csv(data)
    else:
        output = client.to_markdown(data, args.indicator)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Saved to {args.output}")
    else:
        print(output)
