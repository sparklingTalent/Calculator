# Google Sheets Setup Guide

This guide will help you set up your Google Sheets as the data source for the calculator.

## Step 1: Create Your Spreadsheet

Create a new Google Sheet with the following structure:

### Column Headers (Row 1)

| Zone | Country | Standard | Express | Fulfillment |
|------|---------|----------|---------|-------------|
| Zone 1 | United States | 15.00 | 35.00 | 5.00 |
| Zone 1 | Canada | 18.00 | 40.00 | 5.00 |
| Zone 2 | United Kingdom | 22.00 | 50.00 | 6.00 |
| Zone 2 | Germany | 20.00 | 45.00 | 6.00 |
| Zone 2 | France | 21.00 | 48.00 | 6.00 |
| Zone 3 | Australia | 25.00 | 55.00 | 7.00 |
| Zone 3 | Japan | 24.00 | 52.00 | 7.00 |

### Notes:
- **Zone**: Shipping zone identifier (e.g., "Zone 1", "Zone 2")
- **Country**: Full country name (must match exactly what users select)
- **Standard**: Base shipping rate for standard service (per kg)
- **Express**: Base shipping rate for express service (per kg)
- **Fulfillment**: Fixed fulfillment fee

### Example Sheet Structure

```
A1: Zone          B1: Country          C1: Standard    D1: Express    E1: Fulfillment
A2: Zone 1         B2: United States    C2: 15.00       D2: 35.00      E2: 5.00
A3: Zone 1         B3: Canada          C3: 18.00       D3: 40.00      E3: 5.00
A4: Zone 2         B4: United Kingdom   C4: 22.00       D4: 50.00      E4: 6.00
```

## Step 2: Get Your Spreadsheet ID

1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Copy the `SPREADSHEET_ID` part (the long string between `/d/` and `/edit`)

Example:
- URL: `https://docs.google.com/spreadsheets/d/1abc123def456ghi789jkl012mno345pqr/edit`
- Sheet ID: `1abc123def456ghi789jkl012mno345pqr`

## Step 3: Set Up Google Cloud Project

### 3.1 Create a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name it (e.g., "Shipping Calculator")
4. Click "Create"

### 3.2 Enable Google Sheets API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click on it and press **Enable**

### 3.3 Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in:
   - **Name**: `shipping-calculator-service`
   - **Description**: `Service account for shipping calculator`
4. Click **Create and Continue**
5. Skip role assignment (click **Continue**)
6. Click **Done**

### 3.4 Generate Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON**
5. Click **Create**
6. A JSON file will download - **SAVE THIS FILE!**

## Step 4: Share Sheet with Service Account

1. Open the downloaded JSON file
2. Find the `client_email` field (looks like: `shipping-calculator-service@your-project.iam.gserviceaccount.com`)
3. Copy that email address
4. Go back to your Google Sheet
5. Click **Share** (top right)
6. Paste the service account email
7. Set permission to **Viewer** (read-only)
8. Uncheck "Notify people"
9. Click **Share**

## Step 5: Configure Backend

1. Place the downloaded JSON file in the `backend/` folder
2. Rename it to `service-account-key.json` (or keep original name)
3. Update `backend/.env`:

```env
GOOGLE_SHEET_ID=your-spreadsheet-id-here
GOOGLE_SHEET_RANGE=Sheet1!A1:Z1000
GOOGLE_SERVICE_ACCOUNT_KEY=./service-account-key.json
```

## Step 6: Test Connection

1. Start backend: `cd backend && npm run dev`
2. Test endpoint: `curl http://localhost:3001/api/pricing`
3. You should see JSON with your pricing data

## Advanced: Custom Column Names

The system auto-detects columns by name. Supported column names:

- **Zone**: `Zone`, `zone`, `Shipping Zone`
- **Country**: `Country`, `country`, `Destination`, `destination`
- **Standard**: `Standard`, `standard`, `Standard Rate`, `standard_rate`
- **Express**: `Express`, `express`, `Express Rate`, `express_rate`
- **Fulfillment**: `Fulfillment`, `fulfillment`, `Fulfillment Fee`, `fulfillment_fee`

## Troubleshooting

### "Failed to fetch pricing data"

**Check:**
1. ✅ Service account JSON file is in correct location
2. ✅ Sheet is shared with service account email
3. ✅ Google Sheets API is enabled
4. ✅ Spreadsheet ID is correct
5. ✅ Range includes all your data

### "Permission denied"

**Solution:**
- Re-share the sheet with the service account email
- Make sure it has at least "Viewer" access

### "Sheet not found"

**Solution:**
- Verify the Spreadsheet ID in `.env`
- Make sure the sheet exists and is accessible

### Data not updating

**Solution:**
- Clear cache: Restart backend server
- Cache TTL is 5 minutes - wait or restart

## Best Practices

1. **Keep it organized**: Use consistent zone names
2. **Update regularly**: Keep rates current
3. **Backup data**: Export sheet periodically
4. **Test changes**: Verify calculations after updates
5. **Document zones**: Add a second sheet explaining zones

## Example: Multiple Sheets

If you have multiple sheets in one spreadsheet:

```env
GOOGLE_SHEET_RANGE=Pricing!A1:Z1000
```

Or use different spreadsheets for different regions.

## Security Notes

- ⚠️ Never commit `service-account-key.json` to Git
- ⚠️ Use environment variables in production
- ⚠️ Limit service account to read-only access
- ⚠️ Regularly rotate service account keys

## Need Help?

1. Check backend logs for detailed errors
2. Test Google Sheets API directly in console
3. Verify service account permissions
4. Review Google Cloud Console for API quotas

