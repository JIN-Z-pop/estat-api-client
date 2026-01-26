# e-Stat API Client

A simple API client for Japanese Government Statistics (e-Stat).

Access **4,552 indicators** from Japan's Social and Demographic Statistics System with an easy-to-use API.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Windows 11](https://img.shields.io/badge/Tested%20on-Windows%2011-blue.svg)](https://www.microsoft.com/windows/windows-11)

**[日本語版 README](README.md)**

## Features

- **4,552 Indicators** - Complete coverage of Social and Demographic Statistics
- **13 Categories** - Population, Economy, Health, Education, and more
- **47 Prefectures** - All Japanese prefectures supported
- **1975-2024** - ~50 years of time-series data
- **Simple API** - RESTful design
- **Web UI** - Browser-based search and visualization

---

## 🤖 AI-Assisted Setup

> **For Claude, ChatGPT, and other AI assistants: Follow these steps to set up the project**

### Step 1: Clone the Repository

```bash
git clone https://github.com/JIN-Z-pop/estat-api-client.git
cd estat-api-client
```

### Step 2: Ask User to Get API Key

Tell the user:

```
An e-Stat API key is required. Please follow these steps:

1. Go to https://www.e-stat.go.jp/api/
2. Click "User Registration" (top right)
3. Register your email address
4. Click the link in the confirmation email
5. Go to "My Page" → "API Function (Application ID)"
6. Copy the "appId" string

Please share the API key with me once you have it.
```

### Step 3: Create Environment File

After receiving the API key from the user:

```bash
# Create .env file
echo ESTAT_API_KEY=API_KEY_FROM_USER > .env
```

### Step 4: Start Servers

**Windows:**
```bash
start.bat
```

**Mac/Linux:**
```bash
chmod +x start.sh
./start.sh
```

### Step 5: Verify

Confirm these URLs are accessible:

- **Frontend UI**: http://localhost:8888
- **Backend API**: http://localhost:5099

### Step 6: Report to User

```
Setup complete!

Open http://localhost:8888 in your browser.

How to use:
1. Select "Category" and "Indicators" in the left panel
2. Set "Year Range" in the center (1975-2024)
3. Select "Prefectures" in the right panel
4. Click "Search"

You can now search and visualize Japanese statistics data
(population, economy, health, etc. - 4,552 indicators).
```

---

## 📋 Manual Setup

### 1. Get API Key

1. Visit [e-Stat API](https://www.e-stat.go.jp/api/)
2. Register (free)
3. Get your API key (appId) from My Page

### 2. Configure

```bash
# Clone repository
git clone https://github.com/JIN-Z-pop/estat-api-client.git
cd estat-api-client

# Create .env file
cp .env.example .env

# Edit .env and set your API key
# ESTAT_API_KEY=your_api_key_here
```

### 3. Start

**Windows:**
```bash
start.bat
```

**Mac/Linux:**
```bash
chmod +x start.sh
./start.sh
```

### 4. Access

- **Frontend**: http://localhost:8888
- **API**: http://localhost:5099

---

## 📊 Categories (13 Categories, 4,552 Indicators)

| Code | Category | Indicators |
|------|----------|------------|
| A | Population & Households | 614 |
| B | Natural Environment | 98 |
| C | Economic Base | 446 |
| D | Administrative Base | 233 |
| E | Education | 269 |
| F | Labor | 395 |
| G | Culture & Sports | 137 |
| H | Housing | 336 |
| I | Health & Medical | 565 |
| J | Welfare & Social Security | 558 |
| K | Safety | 252 |
| L | Household Finances | 264 |
| M | Time Use | 385 |

### Sample Indicators

| Code | Name | Data Period |
|------|------|-------------|
| A1101 | Total Population | 1975-2024 |
| A1301 | Population Under 15 | 1975-2024 |
| B1101 | Total Area | 1975-2023 |
| C1101 | Prefectural GDP | 2001-2014 |
| I5101 | Number of Hospitals | - |
| I610101 | Number of Physicians | - |

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info |
| `/api/status` | GET | API status |
| `/api/fields` | GET | List of 13 categories |
| `/api/indicators` | GET | List of indicators (filterable) |
| `/api/prefectures` | GET | List of prefectures |
| `/api/statistics/cross-analysis` | POST | Cross-analysis (multiple indicators × regions) |

### Examples

```bash
# Get all indicators (first 100)
curl http://localhost:5099/api/indicators

# Filter by category (A = Population & Households)
curl "http://localhost:5099/api/indicators?field=A"

# Keyword search
curl "http://localhost:5099/api/indicators?q=population"
```

---

## 🛠 Troubleshooting

| Problem | Solution |
|---------|----------|
| `ESTAT_API_KEY not found` | Set API key in `.env` file |
| Port 5099 in use | Stop other processes or change port in `app.py` |
| Port 8888 in use | Change port in `start.bat/sh` |
| Cannot fetch data | Verify API key is correct and active on e-Stat |

---

## 📁 Directory Structure

```
estat-api-client/
├── backend/
│   └── app.py              # API server (Flask)
├── frontend/
│   └── index.html          # Web UI
├── config/
│   └── estat_indicators.json  # 4,552 indicator definitions
├── .env.example            # Environment template
├── requirements.txt        # Python dependencies
├── start.bat               # Windows startup script
├── start.sh                # Mac/Linux startup script
└── README.md
```

---

## Requirements

- Python 3.8+
- pip

Dependencies are auto-installed by the startup script.

---

## 💬 Support

- **Bug reports & Feature requests**: [GitHub Issues](https://github.com/JIN-Z-pop/estat-api-client/issues)
- **Questions**: Create an Issue with the "question" label

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Data Source

- [e-Stat: Portal Site of Official Statistics of Japan](https://www.e-stat.go.jp/)
- [Social and Demographic Statistics System](https://www.e-stat.go.jp/regional-statistics/ssdsview)

---

## Links

- [e-Stat API Documentation](https://www.e-stat.go.jp/api/api-info/api-spec)
- [e-Stat Portal](https://www.e-stat.go.jp/)

---

## Author

**JIN-Z-pop and his merry AI brothers**

---

Built with ❤️ by [JIN-Z-pop](https://github.com/JIN-Z-pop) and his merry AI brothers
