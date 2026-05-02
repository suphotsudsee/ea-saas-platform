#!/bin/sh
set -e

# Only run db push if DATABASE_URL is set and prisma CLI exists
if [ -n "$DATABASE_URL" ] && [ -f "./node_modules/prisma/build/index.js" ]; then
  echo "📊 Pushing Prisma schema to database..."
  node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>&1 || echo "⚠️ Prisma db push warning (tables may already exist)"
else
  echo "⏭️ Skipping Prisma db push (DATABASE_URL not set or prisma CLI missing)"
fi

echo "🚀 Starting Next.js server..."
exec node server.js