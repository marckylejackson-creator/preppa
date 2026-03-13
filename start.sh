#!/bin/bash
# Kill any process holding port 5000
PID=$(lsof -ti :5000 2>/dev/null)
if [ -n "$PID" ]; then
  echo "Killing existing process on port 5000 (PID: $PID)"
  kill -9 $PID 2>/dev/null
  sleep 1
fi

# Also kill any stale tsx server processes by name
pkill -9 -f "tsx server/index" 2>/dev/null

# Brief pause to ensure port is fully released
sleep 1

echo "Starting server..."
NODE_ENV=development exec node_modules/.bin/tsx server/index.ts
