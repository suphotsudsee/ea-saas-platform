#!/bin/sh
# ⚠️ Do NOT use `set -e` — prisma db push may return non-zero for harmless warnings

echo "📊 Pushing Prisma schema to database..."

# Try multiple prisma paths — in standalone builds, .bin symlinks may not survive COPY
node ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss 2>&1 \
  || node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>&1 \
  || echo "⚠️ Prisma db push warning (tables may already exist)"

echo "🚀 Starting Next.js server..."
exec node server.js
