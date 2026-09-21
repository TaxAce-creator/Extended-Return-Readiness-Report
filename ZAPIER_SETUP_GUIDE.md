# TaxAce Dashboard — Zapier Automation Setup Guide

## Overview

This guide walks you through setting up the Zapier Zap that automatically sends your daily Canopy report to the TaxAce dashboard. Once configured, the dashboard will update itself every morning without any manual steps.

**The complete flow:**
```
Canopy sends scheduled email → Gmail (team@taxacebsi.com)
        ↓
Zapier detects the email and extracts the CSV attachment
        ↓
Zapier sends the CSV to the dashboard webhook
        ↓
Dashboard auto-updates — your team opens it and sees fresh data
```

---

## Step 1: Configure Canopy to Send the Daily Report

1. Log in to Canopy and navigate to **Reports** or **Task Filters**.
2. Set up your standard tax preparer task filter (the same one you currently export manually).
3. Enable **Scheduled Email Delivery** and set it to send daily at **6:00 AM** (before your team's standup).
4. Set the recipient to **team@taxacebsi.com**.
5. Make sure the export format is **CSV**.
6. Save the scheduled report.

---

## Step 2: Create the Zapier Zap

### Trigger: Gmail — New Email Matching Search

1. In Zapier, click **Create Zap**.
2. Choose **Gmail** as the trigger app.
3. Select **New Email Matching Search** as the trigger event.
4. Connect your **team@taxacebsi.com** Gmail account.
5. In the **Search String** field, enter:
   ```
   from:canopy subject:report has:attachment
   ```
   Adjust the subject keyword to match the exact subject line Canopy uses.
6. Test the trigger — Zapier should find the most recent Canopy email.

---

### Action 1: Gmail — Get Attachment (Extract the CSV)

1. Add a new action step.
2. Choose **Gmail** as the app.
3. Select **Get Attachment** as the action event.
4. Map the **Message ID** from the trigger step.
5. Select the CSV attachment from the list.
6. Test this step — you should see the raw CSV content returned.

---

### Action 2: Webhooks by Zapier — POST to Dashboard

1. Add a new action step.
2. Choose **Webhooks by Zapier** as the app.
3. Select **POST** as the action event.
4. Configure the webhook:

   | Field | Value |
   |---|---|
   | **URL** | `https://taxpreparers.taxace.io/api/webhooks/zapier-canopy` |
   | **Payload Type** | `JSON` |
   | **Data — csvContent** | Select the CSV text from the previous step |
   | **Data — filename** | `canopy-report-{{zap_meta_human_now}}.csv` |
   | **Headers — x-webhook-secret** | *(Enter the ZAPIER_WEBHOOK_SECRET value you set in the dashboard settings)* |

5. Test the action — you should see a response like:
   ```json
   { "success": true, "rowCount": 286, "message": "Dashboard updated with 286 tasks" }
   ```

6. Turn the Zap **ON**.

---

## Step 3: Verify It Works

1. After turning the Zap on, open the TaxAce dashboard at `https://taxpreparers.taxace.io`.
2. The header should show **"Auto-synced via Zapier"** badge.
3. The pipeline data should match the latest Canopy report.
4. Click the **refresh icon** (↻) in the header at any time to pull the latest synced data.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Zap fires but dashboard shows 401 Unauthorized | Double-check the `x-webhook-secret` header value matches exactly what is set in the dashboard environment |
| Zap fires but rowCount is 0 | The CSV attachment may be empty or in a different format — check the Gmail attachment step |
| Dashboard doesn't auto-load on page open | Make sure the site is **Published** (click Publish in the Management UI) — the webhook only works on the live deployed site |
| Canopy email not detected by Zapier | Adjust the Gmail search string to match the exact subject line Canopy uses |

---

## Security Notes

- The `ZAPIER_WEBHOOK_SECRET` is stored securely in the dashboard environment and never exposed to the browser.
- Only requests that include the correct secret in the `x-webhook-secret` header (or `?secret=` query parameter) are accepted.
- All data is stored in the dashboard's private database — not in any public location.

---

## Manual Override

If Canopy's email is delayed or you need to update the dashboard outside the scheduled time:

1. Export the CSV manually from Canopy.
2. Open the dashboard and click **Upload Report**.
3. The dashboard will update immediately and save the report to the database.
4. The next Zapier sync will overwrite this with the latest automated report.
