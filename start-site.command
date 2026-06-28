#!/bin/sh

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "[WK1995] Node.js was not found."
  echo "Please install Node.js LTS, then run this file again:"
  echo "https://nodejs.org/"
  echo
  open "https://nodejs.org/" >/dev/null 2>&1
  read -r -p "Press Enter to exit..."
  exit 1
fi

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8024}"
HOME_URL="http://${HOST}:${PORT}/"

echo
echo "[WK1995] Starting local site service..."
echo "[WK1995] Home: ${HOME_URL}"
echo "[WK1995] Keep this window open while previewing the site."
echo

(sleep 1; open "${HOME_URL}") >/dev/null 2>&1 &

node scripts/video-resolver-server.cjs "${PORT}"

echo
echo "[WK1995] Site service stopped."
read -r -p "Press Enter to exit..."
