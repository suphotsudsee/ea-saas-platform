#!/bin/sh

echo "📊 Pushing Prisma schema to database..."
node ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss 2>&1 || node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>&1 || echo "⚠️ Prisma db push warning (tables may already exist)"

echo "🚀 Starting Next.js server..."
exec node server.js