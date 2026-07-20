import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { E2BService, SandboxGoneError, SandboxNotFoundError } from '@/lib/e2b.service';
import { EntitlementsService } from '@/modules/billing/entitlements.service';
import { env } from '@/config/env';

const CHECK_INTERVAL_MS = 30 * 1000;
const RENEWAL_WINDOW_MS = 10 * 60 * 1000;
const DEAD_THRESHOLD_MS = 10 * 60 * 1000;
// A renewing flag older than this is considered stale (its renewal crashed
// mid-flight) and no longer blocks auto-renewal.
const RENEWING_STALE_MS = 15 * 60 * 1000;

@Injectable()
export class SandboxLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SandboxLifecycleService.name);
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly e2b: E2BService,
    private readonly entitlements: EntitlementsService,
  ) {}

  onModuleInit() {
    this.interval = setInterval(() => {
      void this.checkRenewals();
    }, CHECK_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async checkRenewals() {
    if (!this.e2b.configured) return;

    const now = Date.now();
    const entries = await this.e2b.getSandboxInfos();

    for (const { sandboxId, endAt: endAtStr, renewing, renewingSince, userId } of entries) {
      // Skip sandboxes with an in-flight renewal — but treat a renewing flag
      // older than RENEWING_STALE_MS as stale (left behind by a crashed
      // renewal) and proceed; the Redis renewal lock still serializes the
      // actual renewal.
      if (renewing && renewingSince && now - renewingSince < RENEWING_STALE_MS) continue;

      const endAt = new Date(endAtStr).getTime();
      const expiresIn = endAt - now;

      if (expiresIn <= RENEWAL_WINDOW_MS) {
        // Sandboxes that have been expired for a long time are dead; don't waste
        // E2B calls trying to renew them. Purge them from tracking instead.
        if (expiresIn < -DEAD_THRESHOLD_MS) {
          this.logger.warn(
            `Sandbox ${sandboxId} expired ${-expiresIn}ms ago; purging from tracking`,
          );
          await this.e2b.removeSandboxInfo(sandboxId);
          continue;
        }

        // Session-liveness gate: renew only sandboxes whose owner has a live
        // session (frontend heartbeat poll or agent activity) within the grace
        // window (SANDBOX_LIVENESS_GRACE_MS, default 15min). Stale sandboxes
        // are KILLED instead of renewed — previously every tracked sandbox was
        // renewed forever, even with all browsers closed.
        const lastSeen = await this.e2b.getSandboxLastSeen(sandboxId);
        if (lastSeen === null || now - lastSeen > env().sandboxLivenessGraceMs) {
          this.logger.warn(
            `Sandbox ${sandboxId} not renewed: no live session within ${env().sandboxLivenessGraceMs}ms grace; killing it`,
          );
          try {
            await this.e2b.kill(sandboxId);
          } catch (e) {
            this.logger.warn(`Failed to kill stale sandbox ${sandboxId}: ${e instanceof Error ? e.message : String(e)}`);
          }
          continue;
        }

        // Plan gate: when the owner's monthly sandbox hours are exhausted,
        // stop renewing — the session ends naturally at its TTL (never a
        // mid-session kill) and the elapsed time is billed on purge.
        if (userId) {
          try {
            const remaining = await this.entitlements.sandboxSecondsRemaining(userId);
            if (remaining <= 0) {
              this.logger.warn(
                `Sandbox ${sandboxId} not renewed: monthly sandbox hours exhausted for user ${userId}`,
              );
              continue;
            }
          } catch (e) {
            this.logger.warn(`Could not check sandbox quota for ${sandboxId}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        this.logger.log(`Auto-renewing sandbox ${sandboxId} (expires in ${expiresIn}ms)`);
        await this.e2b.setRenewing(sandboxId, true);
        this.e2b
          .renewSandbox(sandboxId)
          .then((data) => {
            this.logger.log(
              `Auto-renewed sandbox ${sandboxId} -> ${data.sandboxId} (${data.filesMigrated} files)`,
            );
          })
          .catch(async (err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            const isGone =
              err instanceof SandboxNotFoundError ||
              err instanceof SandboxGoneError ||
              /sandbox_not_found|sandbox_gone|_not_found|not found|gone|not running/i.test(msg);

            if (isGone) {
              this.logger.warn(
                `Auto-renewal found dead sandbox ${sandboxId}; purging it from tracking`,
              );
              await this.e2b.removeSandboxInfo(sandboxId);
            } else {
              this.logger.error(`Auto-renewal failed for ${sandboxId}: ${msg}`);
            }
          })
          .finally(async () => {
            await this.e2b.setRenewing(sandboxId, false);
          });
      }
    }
  }
}
