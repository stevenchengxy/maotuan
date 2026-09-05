#!/bin/zsh
# 装网易云音乐的 MCP（Code-MonkeyZhang/cloud-music-mcp）。需要：本机装了网易云音乐客户端、uv。
set -e
DEST="${1:-$HOME/.maotuan/cloud-music-mcp}"
UV="$(command -v uv || echo /opt/homebrew/bin/uv)"
if [ ! -x "$UV" ]; then echo "没找到 uv。先装：brew install uv"; exit 1; fi
mkdir -p "$(dirname "$DEST")"
if [ ! -d "$DEST/.git" ]; then git clone https://github.com/Code-MonkeyZhang/cloud-music-mcp.git "$DEST"; else (cd "$DEST" && git pull --ff-only || true); fi
cd "$DEST"
PY="$(ls /opt/homebrew/opt/python@3.12/bin/python3.12 /opt/homebrew/opt/python@3.13/bin/python3.13 /opt/homebrew/bin/python3 2>/dev/null | head -1)"
"$UV" venv ${PY:+--python "$PY"} --clear
"$UV" pip install -e .
echo
echo "装好了。把这个路径填到毛团设置里的「cloud-music-mcp 可执行文件路径」："
echo "$DEST/.venv/bin/cloud-music-mcp"
