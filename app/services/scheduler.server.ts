import db from "../db.server";
import { unauthenticated } from "../shopify.server";
import { executeCampaign } from "./campaign.server";
import { getActiveSubscription } from "./billing.server";

let isRunning = false;

/**
 * Single scheduler tick — find and execute all overdue campaigns
 */
async function runTick() {
  try {
    const now = new Date();
    const dueCampaigns = await db.adjustmentCampaign.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { lte: now },
      },
    });

    if (dueCampaigns.length === 0) return;

    for (const campaign of dueCampaigns) {
      try {
        const { admin } = await unauthenticated.admin(campaign.shop);

        // Billing gate — skip campaigns for shops with no active subscription
        const { plan } = await getActiveSubscription(admin);
        if (!plan) {
          await db.adjustmentCampaign.update({
            where: { id: campaign.id },
            data: { status: "failed", failureReason: "No active subscription. Please upgrade to run scheduled price changes." },
          });
          continue;
        }

        await executeCampaign(admin, campaign.id);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        await db.adjustmentCampaign.update({
          where: { id: campaign.id },
          data: { status: "failed", failureReason: reason },
        });
      }
    }
  } catch {
    // Scheduler tick failed silently — will retry on next interval
  }
}

/**
 * Background worker to process scheduled campaigns.
 * - Resets any campaigns stuck in "processing" (from a previous crash) back to "scheduled"
 * - Runs an immediate tick on startup to catch overdue campaigns from downtime
 * - Polls every 30 seconds
 */
export async function startScheduler() {
  if (isRunning) return;
  isRunning = true;

  // Reset campaigns stuck mid-execution from a previous crash
  await db.adjustmentCampaign.updateMany({
    where: { status: "processing" },
    data: { status: "scheduled" },
  });

  // Immediate tick — catch anything overdue since last restart
  await runTick();

  // Recurring check
  setInterval(runTick, 30000);
}
