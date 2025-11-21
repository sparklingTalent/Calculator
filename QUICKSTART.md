# Quick Start Guide

Get the Shipping Cost Calculator running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- A Google account (for Google Sheets)

## Step 1: Install Dependencies

```bash
npm run install:all
```

This installs dependencies for root, backend, and frontend.

## Step 2: Set Up Google Sheets (Optional - Uses Mock Data if Skipped)

### Quick Option: Use Mock Data

The calculator works with mock data out of the box! Skip to Step 3 if you want to test immediately.

### Full Option: Connect Real Google Sheets

1. Follow the detailed guide: [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)
2. Or use the quick setup:
   - Create a Google Sheet with columns: Zone, Country, Standard, Express, Fulfillment
   - Set up Google Cloud service account
   - Share sheet with service account
   - Copy spreadsheet ID

## Step 3: Configure Environment

### Backend Configuration

Create `backend/.env`:

```env
# Optional: Leave empty to use mock data
GOOGLE_SHEET_ID=
GOOGLE_SHEET_RANGE=Sheet1!A1:Z1000
GOOGLE_SERVICE_ACCOUNT_KEY=./service-account-key.json

# Server
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

**Note**: If `GOOGLE_SHEET_ID` is empty, the app uses mock data automatically.

### Frontend Configuration

Create `frontend/.env` (optional):

```env
VITE_API_URL=http://localhost:3001
```

## Step 4: Run the Application

### Development Mode (Both Frontend & Backend)

```bash
npm run dev
```

This starts:
- Backend API: http://localhost:3001
- Frontend App: http://localhost:5173

### Or Run Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 5: Test the Calculator

1. Open http://localhost:5173 in your browser
2. Fill in the form:
   - Weight: `2.5` kg
   - Country: Select any country
   - Service Level: Choose Standard or Express
3. Click "Calculate Costs"
4. See the cost breakdown!

## What's Next?

- ✅ **Customize Design**: Edit CSS in `frontend/src/index.css`
- ✅ **Update Pricing**: Modify Google Sheet (or mock data in `backend/server.js`)
- ✅ **Add Features**: Extend components in `frontend/src/components/`
- ✅ **Deploy**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md)

## Troubleshooting

### Port Already in Use

```bash
# Change port in backend/.env
PORT=3002

# Update frontend/.env
VITE_API_URL=http://localhost:3002
```

### Module Not Found

```bash
# Reinstall dependencies
npm run install:all
```

### Google Sheets Not Working

- Check service account JSON file exists
- Verify sheet is shared with service account email
- Review [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)

### CORS Errors

- Ensure backend is running
- Check `CORS_ORIGIN` in `backend/.env` matches frontend URL

## Project Structure

```
Calculator/
├── backend/          # Node.js API server
│   ├── server.js     # Main server file
│   └── .env          # Environment variables
├── frontend/         # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Calculator.jsx
│   │   │   ├── InputField.jsx
│   │   │   └── ResultCard.jsx
│   │   └── App.jsx
│   └── .env          # Frontend env vars
└── README.md         # Full documentation
```

## Need Help?

- 📖 Full docs: [README.md](./README.md)
- 🚀 Deployment: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 📊 Sheets setup: [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)

Happy calculating! 🎉

