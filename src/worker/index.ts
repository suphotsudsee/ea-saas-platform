// ─── Background Worker ─────────────────────────────────────────────────────────
// Processes Redis streams: heartbeats, trade events, and notifications
// Runs as a separate process in the worker container
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: ReturnType<typeof createClient>;

async function connectRedis() {
  redis = createClient({ url: REDIS_URL });
  redis.on('error', (err) => console.error('Redis Worker Error:', err));
  await redis.connect();
  console.log('Worker: Connected to Redis');
}

// ─── Heartbeat Persist Worker ──────────────────────────────────────────────────

async function processHeartbeats() {
  try {
    const results = await redis.xRead(
      { key: 'stream:heartbeat-persist', id: '0' },
      { COUNT: 50, BLOCK: 5000 }
    );

    if (!results || results.length === 0) return;

    for (const stream of results) {
      if (!stream.messages) continue;

      for (const msg of stream.messages) {
        try {
          const data = msg.message as Record<string, string>;

          await prisma.heartbeat.create({
            data: {
              licenseId: data.licenseId,
              tradingAccountId: data.tradingAccountId,
              eaVersion: data.eaVersion || null,
              equity: data.equity ? parseFloat(data.equity) : null,
              balance: data.balance ? parseFloat(data.balance) : null,
              openPositions: parseInt(data.openPositions || '0'),
              marginLevel: data.marginLevel ? parseFloat(data.marginLevel) : null,
              serverTime: data.serverTime ? new Date(data.serverTime) : null,
            },
          });

          // Acknowledge the message
          await redis.xAck('stream:heartbeat-persist', 'worker-group', msg.id);
        } catch (error) {
          console.error('Worker: Failed to persist heartbeat:', error);
        }
      }
    }
  } catch (error) {
    // Stream might not exist yet — that's fine
    if (!(error as any).message?.includes('NOGROUP')) {
      console.error('Worker: Heartbeat stream error:', error);
    }
  }
}

// ─── Notification Worker ───────────────────────────────────────────────────────

async function processNotifications() {
  try {
    const results = await redis.xRead(
      { key: 'stream:notifications', id: '0' },
      { COUNT: 50, BLOCK: 5000 }
    );

    if (!results || results.length === 0) return;

    for (const stream of results) {
      if (!stream.messages) continue;

      for (const msg of stream.messages) {
        try {
          const data = msg.message as Record<string, string>;

          // Create notification in database
          await prisma.notification.create({
            data: {
              userId: data.userId,
              type: data.type,
              title: data.title,
              message: data.message,
              link: data.link || null,
            },
          });

          // Acknowledge the message
          await redis.xAck('stream:notifications', 'worker-group', msg.id);

          // In production: also send email via Resend/SendGrid
          console.log(`Worker: Notification created — ${data.type} for user ${data.userId}`);
        } catch (error) {
          console.error('Worker: Failed to process notification:', error);
        }
      }
    }
  } catch (error) {
    if (!(error as any).message?.includes('NOGROUP')) {
      console.error('Worker: Notification stream error:', error);
    }
  }
}

// ─── Create Consumer Groups ───────────────────────────────────────────────────

async function createConsumerGroups() {
  const streams = ['stream:heartbeat-persist', 'stream:notifications'];

  for (const stream of streams) {
    try {
      await redis.xGroupCreate(stream, 'worker-group', '0', {
        MKSTREAM: true,
      });
      console.log(`Worker: Created consumer group for ${stream}`);
    } catch (error: any) {
      if (error.message?.includes('BUSYGROUP')) {
        console.log(`Worker: Consumer group already exists for ${stream}`);
      } else {
        console.error(`Worker: Error creating group for ${stream}:`, error);
      }
    }
  }
}

// ─── Stale Heartbeat Detection ────────────────────────────────────────────────

async function detectStaleHeartbeats() {
  const staleFactor = parseInt(process.env.HEARTBEAT_STALE_FACTOR || '3');
  const interval = parseInt(process.env.HEARTBEAT_INTERVAL_SEC || '60');
  const staleThresholdMs = staleFactor * interval * 1000;
  const staleThreshold = new Date(Date.now() - staleThresholdMs);

  try {
    // Mark trading accounts as STALE if last heartbeat is older than threshold
    const staleAccounts = await prisma.tradingAccount.updateMany({
      where: {
        status: 'ACTIVE',
        lastHeartbeatAt: { lt: staleThreshold },
      },
      data: {
        status: 'STALE',
      },
    });

    if (staleAccounts.count > 0) {
      console.log(`Worker: Marked ${staleAccounts.count} accounts as STALE`);
    }

    // Mark accounts as OFFLINE if no heartbeat for > 10 minutes
    const offlineThreshold = new Date(Date.now() - 10 * 60 * 1000);
    const offlineAccounts = await prisma.tradingAccount.updateMany({
      where: {
        status: 'STALE',
        lastHeartbeatAt: { lt: offlineThreshold },
      },
      data: {
        status: 'OFFLINE',
      },
    });

    if (offlineAccounts.count > 0) {
      console.log(`Worker: Marked ${offlineAccounts.count} accounts as OFFLINE`);
    }
  } catch (error) {
    console.error('Worker: Stale heartbeat detection error:', error);
  }
}

// ─── License Expiry Checker ───────────────────────────────────────────────────

async function checkExpiredLicenses() {
  try {
    const result = await prisma.license.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      console.log(`Worker: Expired ${result.count} licenses`);
    }
  } catch (error) {
    console.error('Worker: License expiry check error:', error);
  }
}

// ─── Main Loop ────────────────────────────────────────────────────────────────

async function main() {
  console.log('Worker: Starting...');
  await connectRedis();
  await createConsumerGroups();

  console.log('Worker: Running background processors...');

  // Run periodic tasks
  setInterval(detectStaleHeartbeats, 60_000); // Every minute
  setInterval(checkExpiredLicenses, 300_000); // Every 5 minutes

  // Main stream processing loop
  while (true) {
    await processHeartbeats();
    await processNotifications();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s between cycles
  }
}

main()
  .catch((error) => {
    console.error('Worker: Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (redis.isOpen) await redis.disconnect();
  });