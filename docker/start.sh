#!/bin/sh
set -e

echo "📊 Pushing Prisma schema to database..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "⚠️ Prisma db push warning (tables may already exist)"

echo "🚀 Starting Next.js server..."
exec node server.js