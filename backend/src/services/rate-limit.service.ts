import { redis } from "../config/redis.js";

const RATE_LIMIT_KEY_PREFIX = "email-rate";

export interface RateLimitResult {
  allowed: boolean;
  waitMs: number;
  reason?: "hourly-limit" | "minimum-delay";
}

const reserveSendScript = `
local counterKey = KEYS[1]
local lastSendKey = KEYS[2]

local maxEmails = tonumber(ARGV[1])
local minDelay = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local windowSeconds = tonumber(ARGV[4])

local count = tonumber(redis.call("GET", counterKey) or "0")
local lastSend = tonumber(redis.call("GET", lastSendKey) or "0")

if count >= maxEmails then
    return {0, 1}
end

if lastSend > 0 and (now - lastSend) < minDelay then
    return {0, 2}
end

redis.call("INCR", counterKey)

redis.call(
    "SET",
    lastSendKey,
    now
)

redis.call(
    "EXPIRE",
    counterKey,
    windowSeconds
)

return {1, 0}
`;

export async function reserveEmailSend(
  campaignId: string,
  hourlyLimit: number,
  delayBetweenEmails: number
): Promise<RateLimitResult> {

  const now = Date.now();

  const hourWindow = new Date(now)
    .toISOString()
    .slice(0, 13);

  // IMPORTANT:
  // Rate limit must be per campaign.
  const counterKey =
    `${RATE_LIMIT_KEY_PREFIX}:${campaignId}:${hourWindow}`;

  const lastSendKey =
    `${RATE_LIMIT_KEY_PREFIX}:last-send:${campaignId}`;

  const maxEmails = Math.max(
    1,
    Number(hourlyLimit)
  );

  const minDelay = Math.max(
    0,
    Number(delayBetweenEmails)
  );

  const result =
    (await redis.eval(
      reserveSendScript,
      2,
      counterKey,
      lastSendKey,
      maxEmails,
      minDelay,
      now,
      7200
    )) as [number, number];

  const [allowed, reasonCode] = result;

  if (allowed === 1) {
    return {
      allowed: true,
      waitMs: 0,
    };
  }

  if (reasonCode === 1) {

    const nextHour = new Date(now);

    nextHour.setUTCMinutes(60, 0, 0);

    return {
      allowed: false,
      waitMs:
        Math.max(
          1000,
          nextHour.getTime() - now
        ),
      reason: "hourly-limit",
    };
  }

  const lastSend =
    Number(
      await redis.get(lastSendKey)
    ) || 0;

  return {
    allowed: false,

    waitMs: Math.max(
      100,
      minDelay - (now - lastSend)
    ),

    reason: "minimum-delay",
  };
}