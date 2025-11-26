# Portless Shipping Rate Calculator

An interactive, responsive shipping cost calculator for logistics platforms. This calculator allows users to input product variables (weight, dimensions, country, service level) and instantly receive fulfillment fees, shipping costs, and total landed cost estimates.

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete deployment instructions for frontend and backend
- **[MAINTENANCE_GUIDE.md](./MAINTENANCE_GUIDE.md)** - Ongoing maintenance and update procedures
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete backend API reference
- **[COMPONENT_DOCUMENTATION.md](./COMPONENT_DOCUMENTATION.md)** - Complete frontend component reference

**For developers deploying:** Start with [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)  
**For API integration:** See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)  
**For frontend development:** See [COMPONENT_DOCUMENTATION.md](./COMPONENT_DOCUMENTATION.md)

## Features

- ✅ **Interactive Web-Based Calculator** - Responsive design for desktop and mobile
- ✅ **Works Out of the Box** - Uses mock data by default (no setup required!)
- ✅ **Dynamic Data Connection** - Pulls pricing from Google Sheets (optional, easily updatable)
- ✅ **Real-time Calculations** - Instant cost breakdowns with delivery time estimates
- ✅ **Professional UI/UX** - Modern, polished interface with smooth animations
- ✅ **Webflow Embeddable** - Can be embedded via iframe or script tag
- ✅ **Caching** - Optimized performance with intelligent caching
- ✅ **Scalable Architecture** - Easy to extend with new features

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Data Source**: Google Sheets API
- **Caching**: Node-Cache (in-memory)

## Project Structure

```
Calculator/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Calculator.jsx
│   │   │   ├── InputField.jsx
│   │   │   └── ResultCard.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/           # Node.js API server
│   ├── server.js
│   └── package.json
├── package.json       # Root package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- **Optional**: Google Cloud Project with Sheets API enabled (for live data)
- **Optional**: Google Service Account JSON key file (for live data)

**Note**: The calculator works immediately with mock data - no Google Sheets setup required for testing!

### 1. Install Dependencies

```bash
npm run install:all
```

This will install dependencies for the root, backend, and frontend.

### 2. Configure Google Sheets API (Optional - Skip for Mock Data)

**You can skip this step to use mock data for testing!**

If you want to use real Google Sheets data:

1. Create a Google Cloud Project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the Google Sheets API
3. Create a Service Account and download the JSON key file
4. Place the key file in the `backend/` directory as `service-account-key.json`
5. Share your Google Sheet with the service account email (found in the JSON file)

### 3. Set Up Your Google Sheet

**Note**: Column names are flexible - the system will auto-detect columns by name.

### 4. Configure Environment Variables (Optional)

**For Mock Data Testing**: You can skip this step entirely! The server will use mock data automatically.

**For Google Sheets**: Create `backend/.env` file:

```env
GOOGLE_SHEET_ID=your-spreadsheet-id-here
GOOGLE_SHEET_RANGE=Sheet1!A1:Z1000
GOOGLE_SERVICE_ACCOUNT_KEY=./service-account-key.json
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

To find your Spreadsheet ID: Look at the URL of your Google Sheet:
`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

### 5. Run the Application

**Development mode** (runs both frontend and backend):
```bash
npm run dev
```

**Or run separately**:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Deployment

### Build for Production

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`.

### Embedding in Webflow

#### Option 1: Iframe Embed

1. Build the frontend: `cd frontend && npm run build`
2. Host the `dist/` folder (Netlify, Vercel, etc.)
3. In Webflow, add an Embed element with:
```html
<iframe 
  src="https://your-domain.com" 
  width="100%" 
  height="800px" 
  frameborder="0"
  style="border-radius: 12px;">
</iframe>
```

#### Option 2: Script Tag Embed

1. Build and host the frontend
2. Add this to your Webflow page:
```html
<div id="shipping-calculator-root"></div>
<script src="https://your-domain.com/assets/index.js"></script>
```

### Backend Deployment

Deploy the backend to:
- **Heroku**: `git push heroku main`
- **Railway**: Connect GitHub repo
- **Render**: Deploy from GitHub
- **AWS/DigitalOcean**: Use PM2 or similar

Update the frontend's `VITE_API_URL` environment variable to point to your deployed backend.

## API Endpoints

### GET `/api/pricing`
Fetches pricing data from Google Sheets (cached for 5 minutes).

**Response**:
```json
{
  "zones": {
    "Zone 1": {
      "United States": {
        "standard": 15.00,
        "express": 35.00,
        "fulfillment": 5.00
      }
    }
  },
  "services": {
    "standard": {
      "deliveryDays": "7-14",
      "name": "Standard Shipping"
    },
    "express": {
      "deliveryDays": "3-5",
      "name": "Express Shipping"
    }
  }
}
```

### POST `/api/calculate`
Calculates shipping costs based on inputs.

**Request Body**:
```json
{
  "weight": 2.5,
  "country": "United States",
  "serviceLevel": "standard",
  "dimensions": {
    "length": 30,
    "width": 20,
    "height": 15
  }
}
```

**Response**:
```json
{
  "shippingCost": 37.50,
  "fulfillmentFee": 5.00,
  "totalCost": 42.50,
  "deliveryDays": "7-14",
  "serviceName": "Standard Shipping",
  "zone": "Zone 1"
}
```

### GET `/api/health`
Health check endpoint.

## Customization

### Updating Pricing

Simply update your Google Sheet - changes will be reflected within 5 minutes (cache TTL).

### Styling

Modify CSS variables in `frontend/src/index.css`:
```css
:root {
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  /* ... */
}
```

### Adding Features

The architecture is designed for easy extension:

- **Packaging Selection**: Add to form data and calculation logic
- **Currency Conversion**: Add exchange rate API integration
- **Customer Pricing Tiers**: Extend Google Sheets structure
- **Real-time Carrier APIs**: Replace or supplement Google Sheets data

## Future Enhancements

- [ ] Admin backend for price management
- [ ] Real-time carrier API integration
- [ ] Currency conversion
- [ ] Customer-specific pricing tiers
- [ ] Packaging selection options
- [ ] Margin impact calculator
- [ ] Export/print functionality
- [ ] Historical cost tracking


