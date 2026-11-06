# Apex Strikers tester applications

A small site where players apply to become testers for Apex Strikers.

- `index.html`: welcome screen, the application questions, and public stats
- `admin.html`: sign in to accept, decline, add notes, delete and export applications
- `google-script/Code.gs`: the Google Sheet script that stores everything (see SETUP.md)
- `config.js`: the script URL, Discord invite, and an open/closed switch

## How it works

Applications are saved as rows in a Google Sheet through the script. The script also counts the public stats (totals only, no names), sends optional Discord pings, and checks the admin password on Google's side, so neither the password nor the webhook is ever in the site's code.

Each browser can apply once, the script rejects duplicate Roblox or Discord names, and there's a basic bot filter and flood limit.

## Setup

Follow SETUP.md.

## Run locally

```bash
python -m http.server 5520
```
