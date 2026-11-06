# Apex Strikers tester applications

A small site where players apply to become testers for Apex Strikers.

## How it works

- Applications are posted to a private Discord channel through a webhook (set it in `config.js`).
- The public stats (total applications and how people answered the multiple-choice questions) are counted on abacus.jasoncameron.dev. Names and written answers are never public.
- Each browser can apply once.

## Setup

1. In Discord, open Server Settings → Integrations → Webhooks → New Webhook.
2. Pick a private channel like `#tester-applications` and copy the webhook URL.
3. Paste it into `webhook` in `config.js`.

If someone ever spams the channel, delete the webhook in Discord, create a new one, and paste the new URL in.

To close applications, set `open: false` in `config.js`.

## Run locally

```bash
python -m http.server 5520
```

Testing on localhost uses separate "dev" counters, so it never changes the real stats.
