#!/bin/bash
export XDG_RUNTIME_DIR=/tmp/runtime-$USER
mkdir -p $XDG_RUNTIME_DIR
export PATH="$HOME/node/bin:$PATH"
export NODE_ENV=production
export PORT=3000
cd ~/domains/tradecandle.net/public_html
exec node .next/standalone/server.js
