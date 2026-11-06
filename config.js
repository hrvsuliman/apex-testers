// ─────────────────────────────────────────────────────────────
//  Settings for the Apex Strikers tester applications.
// ─────────────────────────────────────────────────────────────
window.APEX = {
  game: "Apex Strikers",

  // Discord webhook that receives the applications.
  // Discord → your server → Server Settings → Integrations → Webhooks → New Webhook,
  // pick a private channel (e.g. #tester-applications), Copy Webhook URL, paste it here.
  // If someone ever spams it, delete the webhook in Discord and paste a new one here.
  webhook: "",

  discordInvite: "https://discord.gg/3KuKZCT6Xp",

  // Set to false to close applications (the form shows a "closed" message, stats stay visible).
  open: true,
};
