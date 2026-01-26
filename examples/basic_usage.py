# -*- coding: utf-8 -*-
"""
e-Stat API Client - Basic Usage Examples
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from python.estat_client import EStatClient


def main():
    # Initialize client (uses ESTAT_API_KEY environment variable)
    print("=== e-Stat API Client Examples ===\n")

    try:
        client = EStatClient(language="ja")
    except Exception as e:
        print(f"Error: {e}")
        print("\nPlease set ESTAT_API_KEY environment variable.")
        print("Get your free key at: https://www.e-stat.go.jp/api/")
        return

    # Example 1: List available indicators
    print("1. Available indicators (Health field):")
    print("-" * 40)
    health_indicators = client.list_indicators(field="I")
    for ind in health_indicators[:5]:
        print(f"   {ind['key']}: {ind['name_ja']} ({ind['cdCat01']})")
    print()

    # Example 2: Fetch population data
    print("2. Population data (2022):")
    print("-" * 40)
    try:
        data = client.fetch("population", years=[2022])
        print(f"   Total prefectures: {len(data)}")
        if "東京都" in data:
            print(f"   Tokyo 2022: {data['東京都'].get(2022, 'N/A'):,}")
        if "大阪府" in data:
            print(f"   Osaka 2022: {data['大阪府'].get(2022, 'N/A'):,}")
    except Exception as e:
        print(f"   Error: {e}")
    print()

    # Example 3: Fetch hospital data
    print("3. Hospital count by prefecture (2022):")
    print("-" * 40)
    try:
        data = client.fetch("hospitals", years=[2022])
        # Sort by value
        sorted_prefs = sorted(
            [(k, v.get(2022, 0)) for k, v in data.items()],
            key=lambda x: int(x[1]) if x[1] != "-" else 0,
            reverse=True
        )
        print("   Top 5 prefectures:")
        for pref, count in sorted_prefs[:5]:
            print(f"   - {pref}: {count}")
    except Exception as e:
        print(f"   Error: {e}")
    print()

    # Example 4: Export to CSV
    print("4. Export to CSV:")
    print("-" * 40)
    try:
        data = client.fetch("gdp_prefectural", years=[2020, 2021])
        csv_str = client.to_csv(data, "gdp_example.csv")
        print(f"   Saved to gdp_example.csv")
        print(f"   Preview: {csv_str[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    print()

    # Example 5: Using English output
    print("5. English output mode:")
    print("-" * 40)
    try:
        client_en = EStatClient(language="en")
        data_en = client_en.fetch("doctors", years=[2022])
        print(f"   Prefectures: {list(data_en.keys())[:3]}...")
    except Exception as e:
        print(f"   Error: {e}")

    print("\n=== Examples Complete ===")


if __name__ == "__main__":
    main()
