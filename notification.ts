import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = { title: string; content: string };

export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const title = payload.title?.trim();
  const content = payload.content?.trim();
  if (!title || !content) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title and content are required." });
  }
  if (!ENV.slackSecurityWebhookUrl) {
    console.warn("[Notification] SLACK_SECURITY_WEBHOOK_URL is not configured");
    return false;
  }
  try {
    const response = await fetch(ENV.slackSecurityWebhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `*${title.slice(0, 200)}*\n${content.slice(0, 3000)}` }),
    });
    return response.ok;
  } catch (error) {
    console.warn("[Notification] Slack delivery failed:", error);
    return false;
  }
}
