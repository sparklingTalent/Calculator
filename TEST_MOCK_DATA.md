# Testing with Mock Data

The calculator is configured to use **mock data by default** - no Google Sheets setup required!

## Quick Test

1. **Start the backend** (no .env file needed):
   ```bash
   cd backend
   npm run dev
   ```

   You should see:
   ```
   ℹ️  Google Sheets API not configured - using mock data
      (This is normal if you haven't set up Google Sheets yet)
   🚀 Server running on http://localhost:3001
   ```

2. **Test the API**:
   ```bash
   # Get pricing data
   curl http://localhost:3001/api/pricing
   
   # Calculate costs
   curl -X POST http://localhost:3001/api/calculate \
     -H "Content-Type: application/json" \
     -d '{
       "weight": 2.5,
       "country": "United States",
       "serviceLevel": "standard"
     }'
   ```

3. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Open browser**: http://localhost:5173

## Available Mock Countries

The mock data includes these countries:

### Zone 1 (Americas)
- United States
- Canada
- Mexico

### Zone 2 (Europe)
- United Kingdom
- Germany
- France
- Italy
- Spain

### Zone 3 (Asia-Pacific)
- Australia
- Japan
- South Korea
- Singapore

## Mock Pricing Structure

- **Standard Shipping**: 7-14 days
- **Express Shipping**: 3-5 days
- **Fulfillment Fees**: $5-7 depending on zone

## Example Calculations

### Test Case 1: Standard Shipping to US
- Weight: 2.5 kg
- Country: United States
- Service: Standard
- **Expected**: 
  - Shipping: $37.50 (15.00 × 2.5)
  - Fulfillment: $5.00
  - **Total: $42.50**

### Test Case 2: Express Shipping to UK
- Weight: 1.0 kg
- Country: United Kingdom
- Service: Express
- **Expected**:
  - Shipping: $50.00 (50.00 × 1.0)
  - Fulfillment: $6.00
  - **Total: $56.00**

## Switching to Real Google Sheets

When you're ready to use real data:

1. Follow [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)
2. Create `backend/.env`:
   ```env
   GOOGLE_SHEET_ID=your-spreadsheet-id
   GOOGLE_SHEET_RANGE=Sheet1!A1:Z1000
   GOOGLE_SERVICE_ACCOUNT_KEY=./service-account-key.json
   ```
3. Restart the server

The server will automatically detect and use Google Sheets if configured!

