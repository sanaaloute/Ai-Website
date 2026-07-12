import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { E2BService, SandboxGoneError, SandboxNotFoundError } from '@/lib/e2b.service';
import { EntitlementsService } from '@/modules/billing/entitlements.service';

const CHECK_INTERVAL_MS = 30 * 1000;
const RENEWAL_WINDOW_MS = 10 * 60 * 1000;
const DEAD_THRESHOLD_MS = 10 * 60 * 1000;

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

    for (const { sandboxId, endAt: endAtStr, renewing, userId } of entries) {
      if (renewing) continue;

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
