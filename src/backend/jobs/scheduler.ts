import type { Db } from '../db/index.js';
import { runPurgeJob } from './purge-db.js';
import { runAggregateWarmup } from './aggregate-warmup.js';
import { runDunningCheck } from './dunning.js';

export interface SchedulerHandles {
  stop: () => void;
}

const PURGE_INTERVAL_MS = 60 * 60 * 1000;
const WARMUP_INTERVAL_MS = 5 * 60 * 1000;
const DUNNING_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function safeRun(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    const result = await fn();
    console.info(`[jobs] ${name} OK — ${result}`);
  } catch (err) {
    console.error(`[jobs] ${name} FAILED`, err);
  }
}

export function startScheduler(db: Db): SchedulerHandles {
  const purgeTimer = setInterval(
    () => safeRun('purge', () => runPurgeJob(db)),
    PURGE_INTERVAL_MS,
  );

  const warmupTimer = setInterval(
    () => safeRun('aggregate-warmup', () => runAggregateWarmup(db)),
    WARMUP_INTERVAL_MS,
  );

  const dunningTimer = setInterval(
    () => safeRun('dunning', () => runDunningCheck(db)),
    DUNNING_INTERVAL_MS,
  );

  return {
    stop() {
      clearInterval(purgeTimer);
      clearInterval(warmupTimer);
      clearInterval(dunningTimer);
    },
  };
}
