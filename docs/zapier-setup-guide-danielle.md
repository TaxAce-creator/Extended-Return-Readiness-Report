# TaxAce Dashboard — Zapier Automation Setup Guide

**Prepared for:** Danielle (danielle@taxace.com) — Zapier Tech Lead  
**Prepared by:** NZ, TaxAce Group Inc.  
**Dashboard URL:** https://taxpreparers.taxace.io  
**Date:** May 2026

---

## Overview

This guide walks you through building the Zap that automatically pushes Canopy task reports into the TaxAce Dashboard the moment Canopy emails them. Once live, NZ will never need to manually upload a CSV — the pipeline will update itself every time Canopy sends a new report.

The Zap has **three steps**:

| Step | App | Action |
|------|-----|--------|
| 1 | Gmail | Trigger on new email from Canopy |
| 2 | Formatter by Zapier | Extract the CSV attachment as text |
| 3 | Webhooks by Zapier | POST the CSV to the TaxAce Dashboard |

---

## Before You Start

You will need the following from NZ before building the Zap. Ask NZ to provide these values securely (do **not** share them over email):

| Item | What It Is |
|------|-----------|
| **Webhook Secret** | A private password the dashboard uses to verify the request is from Zapier. NZ can find this in the dashboard's Settings → Secrets panel under the key `ZAPIER_WEBHOOK_SECRET`. |
| **Gmail Access** | Read access to the Gmail account that receives Canopy report emails (or NZ's confirmation of which Gmail account to use). |

---

## Step 1 — Gmail Trigger: New Email Matching Search

1. In Zapier, click **+ Create Zap**.
2. For the **Trigger**, choose **Gmail**.
3. Select the event **New Email Matching Search**.
4. Connect the Gmail account that receives Canopy report emails.
5. In the **Search String** field, enter exactly:

   ```
   from:canopy subject:report has:attachment
   ```

   > This filter ensures the Zap only fires on Canopy report emails that include an attachment. Adjust `subject:report` if Canopy uses a different subject line — ask NZ to forward a sample Canopy email so you can confirm the exact subject.

6. Click **Test Trigger** and select a recent Canopy email as the sample. Confirm you can see the email body and attachment in the test data before moving on.

---

## Step 2 — Formatter: Extract CSV Attachment as Text

Zapier cannot send a file attachment directly to a webhook — it must be converted to plain text first.

1. Add a new **Action** step and choose **Formatter by Zapier**.
2. Select the event **Utilities**.
3. Under **Transform**, choose **Import CSV**.
4. In the **Input** field, map the **Attachment** field from the Gmail trigger (it will appear as something like `Attachment 1 (Content)`).
5. Leave all other settings at their defaults.
6. Click **Test Action** and verify that the output shows comma-separated rows of task data. If you see raw CSV text, the step is working correctly.

> **Troubleshooting:** If the attachment field is empty in the test data, go back to Step 1 and re-select a Canopy email that definitely has a `.csv` attachment. Canopy sometimes sends summary emails without attachments — the search filter above should exclude those, but confirm with NZ what a valid report email looks like.

---

## Step 3 — Webhooks by Zapier: POST to the Dashboard

This step sends the CSV text to the TaxAce Dashboard so it can update the pipeline.

1. Add a new **Action** step and choose **Webhooks by Zapier**.
2. Select the event **POST**.
3. Fill in the fields exactly as follows:

### URL

```
https://taxpreparers.taxace.io/api/webhooks/zapier-canopy
```

### Payload Type

```
json
```

### Data (Key → Value pairs)

| Key | Value |
|-----|-------|
| `csvContent` | Map the **Output** from the Formatter step (the full CSV text string) |
| `filename` | Map the **Attachment Filename** from the Gmail trigger (e.g., `canopy-report.csv`) |

### Headers (Key → Value pairs)

| Key | Value |
|-----|-------|
| `x-webhook-secret` | Paste the **Webhook Secret** NZ provided (keep this private) |
| `Content-Type` | `application/json` |

4. Click **Test Action**.

### Expected Success Response

If everything is configured correctly, Zapier will show a `200 OK` response with a body like:

```json
{
  "success": true,
  "rowCount": 87,
  "message": "Dashboard updated with 87 tasks"
}
```

The number next to `rowCount` will match the number of client tasks in the CSV.

---

## Possible Responses and What They Mean

| HTTP Status | Meaning | What To Do |
|-------------|---------|-----------|
| `200 success: true` | Report accepted and dashboard updated | Nothing — it worked |
| `200 duplicate: true` | Same file was already uploaded before | Nothing — dashboard is already current |
| `400 No CSV content provided` | The Formatter step output was empty | Re-check Step 2; make sure the CSV attachment mapped correctly |
| `401 Unauthorized` | Webhook secret is wrong or missing | Double-check the `x-webhook-secret` header value with NZ |
| `503 Webhook endpoint not configured` | NZ has not set the secret in the dashboard yet | Ask NZ to add `ZAPIER_WEBHOOK_SECRET` in Settings → Secrets |
| `500 Internal server error` | Server-side issue | Screenshot the response and send to NZ |

---

## Step 4 — Name and Activate the Zap

1. Name the Zap something descriptive, for example: **Canopy → TaxAce Dashboard (Auto-Sync)**.
2. Turn the Zap **ON**.
3. Send NZ a confirmation message so they know the automation is live.

---

## How to Verify It Is Working

After the Zap is live, the next time Canopy sends a report email, the dashboard will update automatically. NZ can verify by:

1. Logging into **https://taxpreparers.taxace.io**.
2. Navigating to **Import Data** in the left sidebar.
3. Checking the **Upload History** table — the most recent entry should show `source: zapier` and a timestamp matching when the Canopy email arrived.

---

## Security Notes

- The `x-webhook-secret` header value is a private credential. Store it in Zapier's built-in secret storage and do not paste it into any shared documents or Slack messages.
- The webhook endpoint only accepts `POST` requests with a valid secret. All other requests are automatically rejected.
- The dashboard deduplicates uploads by file content — sending the same CSV twice will not corrupt the data.

---

## Questions?

Contact NZ directly or reach out via the TaxAce team Slack. Do not share the webhook secret over email or Slack — use a secure channel or password manager.
