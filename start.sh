#!/bin/bash
# e-Stat API Client - Startup Script (Mac/Linux)

echo ""
echo "========================================"
echo "  e-Stat API Client - Starting..."
echo "========================================"
echo ""

cd "$(dirname "$0")"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 not found. Please install Python 3.8+"
    exit 1
fi

# Check .env file
if [ ! -f ".env" ]; then
    echo "[WARNING] .env file not found."
    echo "          Copy .env.example to .env and set your API key."
    echo ""
fi

# Create virtual environment if needed
if [ ! -d "venv" ]; then
    echo "[INFO] Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "[INFO] Installing dependencies..."
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo ""
echo "[INFO] Starting servers..."
echo ""

# Start backend server (background)
cd backend
python3 app.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend server (background)
cd frontend
python3 -m http.server 8080 &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "  Servers Started!"
echo "========================================"
echo ""
echo "  Frontend: http://localhost:8080"
echo "  API:      http://localhost:5099"
echo ""
echo "  Press Ctrl+C to stop servers"
echo ""

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
