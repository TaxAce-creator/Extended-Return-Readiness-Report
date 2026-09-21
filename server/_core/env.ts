export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  isProduction: process.env.NODE_ENV === "production",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5-mini",
  slackSecurityWebhookUrl: process.env.SLACK_SECURITY_WEBHOOK_URL ?? "",
  // Legacy compatibility only. Manus-backed helpers are not registered by the standalone app.
  appId: "",
  oAuthServerUrl: "",
  ownerOpenId: "",
  forgeApiUrl: "",
  forgeApiKey: "",
};
