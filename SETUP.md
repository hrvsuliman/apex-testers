# Connect the Google Sheet (about 5 minutes)

Applications are saved in a Google Sheet. A small script inside that sheet receives them, counts the public stats, pings Discord, and powers the admin page.

1. Open **https://sheets.new** to make a new Google Sheet. Name it something like "Apex Applications".
2. In the sheet, click **Extensions → Apps Script**.
3. Delete everything in the editor and paste in the script from
   **https://raw.githubusercontent.com/hrvsuliman/apex-testers/main/google-script/Code.gs**
4. At the top of the script:
   - change `ADMIN_PASSWORD` to your own password (this is what you type on the admin page)
   - optionally paste a Discord webhook into `DISCORD_WEBHOOK` to get a ping for every application and every accept/decline. The webhook stays inside the script, so visitors never see it.
5. Click **Save** (the disk icon).
6. In the toolbar, pick the function **setup** and click **Run**. Google asks for permission:
   **Review permissions → your account → Advanced → Go to (project name) → Allow.**
   That warning shows up because it's your own script and Google hasn't "verified" it, which is normal.
7. Click **Deploy → New deployment**, click the gear and choose **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
8. Send that URL to Claude, or paste it into `api: ""` in `config.js` yourself.

That's it. Applications open as soon as the URL is in `config.js`.

## Using it

- Admin page: **https://hrvsuliman.github.io/apex-testers/admin.html**. Sign in with your `ADMIN_PASSWORD`.
- You can also open the Google Sheet directly to see every row.
- To close applications, set `OPEN = false` in the script (then Deploy → Manage deployments → Edit → Version: New version → Deploy).

## If you change the script later

Always redeploy with **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same.
