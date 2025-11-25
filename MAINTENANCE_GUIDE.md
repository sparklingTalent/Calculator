# Portless Shipping Calculator - Maintenance Guide

This guide covers ongoing maintenance tasks for the Portless Shipping Rate Calculator.

## Table of Contents
1. [Regular Maintenance Tasks](#regular-maintenance-tasks)
2. [Updating Pricing Data](#updating-pricing-data)
3. [Adding New Shipping Lines](#adding-new-shipping-lines)
4. [Adding New Countries](#adding-new-countries)
5. [Modifying Zone Information](#modifying-zone-information)
6. [Code Updates](#code-updates)
7. [Monitoring & Health Checks](#monitoring--health-checks)

---

## Regular Maintenance Tasks

### Weekly
- [ ] Check Railway backend logs for errors
- [ ] Verify calculator is loading correctly
- [ ] Test a few calculations to ensure accuracy

### Monthly
- [ ] Review Google Sheets for data accuracy
- [ ] Check API response times
- [ ] Verify all shipping lines are appearing correctly
- [ ] Test on different browsers/devices

### Quarterly
- [ ] Update dependencies (if needed)
- [ ] Review and optimize performance
- [ ] Check for security updates

---

## Updating Pricing Data

### How to Update Prices

**No code deployment needed!** Simply edit your Google Sheet:

1. **Open your Google Sheet**
   - Access the sheet shared with the service account

2. **Navigate to the relevant tab**
   - Find the shipping line tab (e.g., "Standard Pricing")
   - Locate the country/zone row you want to update

3. **Update the values**
   - Modify "Air Freight" column for freight costs
   - Modify "Injection" column for injection fees
   - Modify "Weight" columns if weight bands change

4. **Save changes**
   - Changes are automatically saved in Google Sheets
   - Backend will pick up changes within 30 minutes (cache expiry)
   - Or restart Railway service for immediate update

### Example: Updating a Price

```
Before:
| Country      | Weight (lb) | Air Freight | Injection |
|--------------|-------------|-------------|-----------|
| United States| 1.0         | 2.50        | 3.79      |

After:
| Country      | Weight (lb) | Air Freight | Injection |
|--------------|-------------|-------------|-----------|
| United States| 1.0         | 2.75        | 3.79      |
```

**Result:** The calculator will show the new price ($2.75) after cache expires or service restart.

---

## Adding New Shipping Lines

### Step-by-Step Process

1. **Create New Tab in Google Sheet**
   - Name it: `[Shipping Line Name] Pricing`
   - Example: "Express Pricing", "Economy Pricing"

2. **Copy Structure from Existing Tab**
   - Copy headers from an existing tab
   - Ensure columns match: Country, Zone, Weight (lb), Weight (kg), Air Freight, Injection

3. **Add Data Rows**
   - Add country names
   - Add zones (if applicable)
   - Add weight values (individual values, not ranges)
   - Add corresponding Air Freight and Injection fees

4. **Verify Tab Name**
   - Tab name should end with "Pricing" for weight lists
   - Backend automatically extracts shipping line name from tab name

5. **Wait for Auto-Detection**
   - Backend processes all tabs automatically
   - New shipping line appears in dropdown within 30 minutes
   - Or restart Railway service for immediate update

### Example: Adding "Express" Shipping Line

1. Create tab: "Express Pricing"
2. Add data:
   ```
   | Country      | Weight (lb) | Air Freight | Injection |
   |--------------|-------------|-------------|-----------|
   | United States| 0.25        | 2.00        | 4.00      |
   | United States| 0.5         | 2.50        | 4.00      |
   ```
3. Save sheet
4. New "Express" option appears in calculator dropdown

---

## Adding New Countries

### Process

1. **Add Country to Existing Tabs**
   - Open relevant shipping line tabs
   - Add new rows with the country name
   - Fill in weight bands and pricing

2. **For Countries with Zones (like Australia)**
   - Add zone names in "Zone" column
   - Create separate rows for each zone
   - Add zone-specific pricing

3. **For Countries without Zones**
   - Leave "Zone" column empty
   - Add country name in "Country" column
   - Add weight bands and pricing

4. **Auto-Detection**
   - Backend automatically detects new countries
   - Appears in country dropdown within 30 minutes
   - Or restart Railway service for immediate update

### Example: Adding "New Zealand"

1. Open "Standard Pricing" tab
2. Add rows:
   ```
   | Country      | Zone | Weight (lb) | Air Freight | Injection |
   |--------------|------|-------------|-------------|-----------|
   | New Zealand  |      | 0.25        | 1.50        | 3.50      |
   | New Zealand  |      | 0.5         | 1.75        | 3.50      |
   ```
3. Save sheet
4. "New Zealand" appears in country dropdown

---

## Modifying Zone Information

### For Australia Zones

Zone descriptions are hardcoded in the frontend. To update:

1. **Edit `frontend/src/components/Calculator.jsx`**
2. **Find the `getZoneDescription` function** (around line 220)
3. **Update the zone descriptions:**

```javascript
const zoneDescriptions = {
  'Zone 1': 'Sydney, Brisbane, Canberra, Melbourne, Adelaide, Perth',
  'Zone 2': 'Newcastle, Wollongong, Geelong, Gold Coast, Sunshine Coast, Toowoomba',
  'Zone 3': 'Regional NSW, Regional QLD, Regional VIC, Regional SA, Regional WA',
  'Zone 4': 'Remote areas, Northern Territory, Tasmania, Outback regions',
};
```

4. **Save and deploy** (Vercel will auto-deploy)

### Adding Zones to Other Countries

Currently, only Australia has zones. To add zones to another country:

1. **Update Google Sheet**
   - Add zone names in "Zone" column for that country
   - Create separate rows for each zone

2. **Backend automatically handles:**
   - Detects zones from sheet data
   - Groups shipping lines by zone
   - Shows zone dropdown when country is selected

---

## Code Updates

### Updating Frontend

1. **Make changes to code**
2. **Test locally:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
4. **Vercel automatically deploys**
   - Check Vercel dashboard for deployment status
   - Review build logs if deployment fails

### Updating Backend

1. **Make changes to code**
2. **Test locally:**
   ```bash
   cd backend
   npm install
   npm start
   ```
3. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
4. **Railway automatically deploys**
   - Check Railway dashboard for deployment status
   - Review build logs if deployment fails

### Manual Deployment

**Vercel:**
- Go to Vercel dashboard
- Select your project
- Click "Redeploy" button

**Railway:**
- Go to Railway dashboard
- Select your service
- Click "Deploy" button

---

## Monitoring & Health Checks

### Backend Health Check

**Endpoint:** `GET https://your-backend-url.railway.app/api/health`

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Check regularly:**
- Response time should be < 500ms
- Status should be "ok"
- If failing, check Railway logs

### Frontend Health Check

**Visual Check:**
1. Visit your Vercel URL
2. Calculator should load within 2-3 seconds
3. Country dropdown should populate
4. Test a calculation

**Browser Console:**
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for API calls

### Common Issues & Solutions

**Issue: Calculator not loading**
- Check Vercel deployment status
- Verify `VITE_API_URL` is set correctly
- Check browser console for errors

**Issue: Countries not appearing**
- Check backend is running (health check)
- Verify Google Sheets API access
- Check Railway logs for errors
- Verify sheet is shared with service account

**Issue: Calculations returning errors**
- Check backend logs in Railway
- Verify weight bands exist for selected country/zone/shipping line
- Check Google Sheet data is complete

**Issue: Slow loading**
- Normal: First load may take 5-10 seconds (fetching all tabs)
- Subsequent loads are cached (30 minutes)
- If consistently slow, check Railway service resources

---

## Google Sheets Best Practices

### Data Formatting

1. **Use consistent country names**
   - "United States" not "USA" or "US"
   - "United Kingdom" not "UK"
   - Check existing names before adding

2. **Weight values**
   - Use individual values (0.25, 0.5, 0.75) not ranges
   - Ensure both lb and kg columns are filled
   - Use 2 decimal places maximum

3. **Pricing values**
   - Use numbers only (no currency symbols)
   - Use 2 decimal places
   - Example: `3.79` not `$3.79` or `3.79 USD`

4. **Transit times**
   - Use format: "5-7 days" or "10 days"
   - Or just numbers: "7" (will be formatted as "7 days")
   - Avoid date serial numbers

### Tab Organization

1. **Naming convention:**
   - `[Shipping Line] Pricing` for weight lists
   - Example: "Standard Pricing", "Priority Pricing"

2. **Keep structure consistent:**
   - Same columns across all tabs
   - Same header row format
   - Same data organization

3. **Avoid:**
   - Tabs named "Rate Calculator" (ignored)
   - Tabs named "Other Services" (ignored)
   - Empty tabs or tabs with no data

---

## Backup & Recovery

### Google Sheets Backup

1. **Automatic backups:**
   - Google Sheets has version history
   - Go to File → Version history → See version history
   - Restore previous versions if needed

2. **Manual backup:**
   - File → Download → Microsoft Excel (.xlsx)
   - Store in secure location

### Code Backup

- Code is stored in GitHub repository
- All changes are version controlled
- Can revert to previous versions via Git

### Environment Variables Backup

**Important:** Keep a secure backup of:
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON)
- Backend URL
- Frontend URL

Store these in a secure password manager.

---

## Performance Optimization

### Cache Management

**Backend caches:**
- Sheet names: 1 hour
- Sheet data: 30 minutes
- Countries data: 30 minutes

**To force refresh:**
- Restart Railway service
- Or wait for cache expiry

### Reducing Load Times

1. **Optimize Google Sheet:**
   - Remove unused tabs
   - Keep data organized
   - Avoid very large sheets

2. **Monitor API calls:**
   - Check Railway metrics
   - Review response times
   - Optimize if consistently slow

---
