# Railway Deployment Setup Guide

## Step-by-Step Railway Configuration

### 1. Initial Deployment

After deploying to Railway, you'll see logs like:
```
❌ Google Sheets API not configured
   Please set GOOGLE_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_KEY in .env
🚀 Server running on http://localhost:8080
⚠️  Google Sheets not configured - API will return errors
```

**This is NORMAL** if you haven't set environment variables yet. The server is running, but it can't connect to Google Sheets.

### 2. Setting Environment Variables

#### Step 1: Get Your Google Sheet ID

1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`
3. Copy the `YOUR_SHEET_ID` part (the long string between `/d/` and `/edit`)

#### Step 2: Get Your Service Account Key

1. Open `backend/service-account-key.json`
2. Copy the entire JSON content
3. It should look like:
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "...",
  ...
}
```

#### Step 3: Add Variables in Railway

1. Go to your Railway project dashboard
2. Click on your service (e.g., "Shipping-calculator")
3. Click the **Variables** tab
4. Click **+ New Variable**

**Add Variable 1:**
- **Name**: `GOOGLE_SHEET_ID`
- **Value**: Paste your Google Sheet ID
- Click **Add**

**Add Variable 2:**
- **Name**: `GOOGLE_SERVICE_ACCOUNT_KEY`
- **Value**: Paste the entire JSON content from `service-account-key.json`
  - **Important**: Paste it as a single-line JSON string, or Railway will handle it automatically
- Click **Add**

#### Step 4: Verify

1. Railway will automatically redeploy when you add environment variables
2. Go to the **Deployments** tab
3. Wait for the new deployment to complete
4. Click on the deployment → **View Logs**
5. You should now see:
```
✅ Google Sheets API initialized
✅ Pre-fetched X sheet names
🚀 Server running on http://localhost:8080
```

### 3. Getting Your Backend URL

#### Method 1: From Railway Dashboard

1. Go to your service → **Settings** tab
2. Scroll down to **Networking** section
3. If you see "No domain assigned", click **Generate Domain**
4. Copy the generated URL (e.g., `https://shipping-calculator-production.up.railway.app`)
5. This is your backend API URL

#### Method 2: From Service Overview

1. Go to your service main page
2. Look for the **Public Domain** section
3. Click **Generate Domain** if needed
4. Copy the URL

#### Method 3: Check Logs

The URL format is usually:
- `https://[service-name]-[environment].up.railway.app`
- Or: `https://[random-id].up.railway.app`

### 4. Testing Your Backend

Once you have your Railway URL, test it:

```bash
# Health check
curl https://your-app.up.railway.app/api/health

# Should return:
# {"status":"ok","timestamp":"...","sheetsConfigured":true}
```

### 5. Common Issues

#### Issue: Still seeing "Google Sheets API not configured"

**Solutions:**
1. Make sure environment variables are set correctly
2. Check that `GOOGLE_SERVICE_ACCOUNT_KEY` is valid JSON
3. Verify the service account email has access to the Google Sheet
4. Redeploy manually: Go to Deployments → Click three dots → Redeploy

#### Issue: "Cannot find module" errors

- This means the Dockerfile build completed but files aren't in the container
- Check the Dockerfile is correct
- Verify the build logs show files being copied

#### Issue: Port conflicts

- Railway automatically sets the `PORT` environment variable
- Your server should use `process.env.PORT || 3001`
- The server.js already handles this correctly

### 6. Next Steps

After your backend is working:

1. **Copy your Railway backend URL**
2. **Deploy frontend to Vercel** (see DEPLOYMENT.md)
3. **Set `VITE_API_URL` in Vercel** to your Railway URL
4. **Test the full application**

## Quick Reference

- **Railway Dashboard**: [railway.app](https://railway.app)
- **Service Variables**: Service → Variables tab
- **Backend URL**: Service → Settings → Networking → Generate Domain
- **Logs**: Service → Deployments → Click deployment → View Logs

