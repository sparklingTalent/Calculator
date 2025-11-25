# Portless Shipping Calculator - Deployment Guide

This guide covers deployment and maintenance for both the frontend and backend of the Portless Shipping Rate Calculator.

## Table of Contents
1. [Overview](#overview)
2. [Backend Deployment (Railway.app)](#backend-deployment-railwayapp)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Environment Variables](#environment-variables)
5. [Google Sheets Setup](#google-sheets-setup)
6. [Maintenance & Updates](#maintenance--updates)

---

## Overview

The calculator consists of two parts:
- **Backend**: Node.js/Express API (deployed on Railway.app)
- **Frontend**: React application (deployed on Vercel)

Both services communicate via API calls. The backend fetches pricing data from Google Sheets.

---

## Backend Deployment (Railway.app)

### Initial Setup

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up or log in
   - Create a new project

2. **Connect Repository**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will automatically detect the project

3. **Configure Build Settings**
   - Railway should auto-detect Node.js
   - The backend is in the `/backend` folder
   - Build command: `cd backend && npm install`
   - Start command: `node backend/server.js`

4. **Set Environment Variables**
   - Go to your service → "Variables" tab
   - Add the following variables (see [Environment Variables](#environment-variables) section)

5. **Deploy**
   - Railway will automatically deploy on push to main branch
   - Or click "Deploy" button manually

### Environment Variables for Backend

Required variables in Railway:

```
GOOGLE_SHEET_ID=your-google-sheet-id
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
PORT=3001
NODE_ENV=production
```

**Important Notes:**
- `GOOGLE_SERVICE_ACCOUNT_KEY` should be the **entire JSON object as a string** (not a file path)
- Copy the entire JSON content from your service account key file
- Wrap it in quotes if setting via Railway UI

### Getting Your Backend URL

After deployment:
1. Go to your Railway service
2. Click "Settings" → "Networking"
3. Generate a public domain or use the default one
4. Copy the URL (e.g., `https://your-service-name.railway.app`)
5. This is your backend API URL

---

## Frontend Deployment (Vercel)

### Initial Setup

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up or log in with GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect React/Vite

3. **Configure Build Settings**
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Set Environment Variables**
   - Go to Project Settings → "Environment Variables"
   - Add: `VITE_API_URL` = your Railway backend URL (e.g., `https://your-service-name.railway.app`)

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically

### Environment Variables for Frontend

Required variable in Vercel:

```
VITE_API_URL=https://your-backend-url.railway.app
```

**Important:**
- Must start with `VITE_` prefix for Vite to expose it
- Use your Railway backend URL (without trailing slash)
- Update this if you change your backend URL

### Custom Domain (Optional)

1. Go to Project Settings → "Domains"
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel will handle SSL certificates automatically

---

## Google Sheets Setup

### Creating Service Account

1. **Go to Google Cloud Console**
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project or select existing

2. **Enable Google Sheets API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

3. **Create Service Account**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Fill in name and description
   - Click "Create and Continue"
   - Skip role assignment (click "Continue")
   - Click "Done"

4. **Generate Key**
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Select "JSON" format
   - Download the JSON file

5. **Share Google Sheet**
   - Open your Google Sheet
   - Click "Share" button
   - Add the service account email (from the JSON file, `client_email` field)
   - Give it "Viewer" permissions
   - Click "Send"

### Sheet Structure Requirements

Your Google Sheet should have:
- Multiple tabs (one per shipping line/channel)
- Tabs ending with "Pricing" contain weight lists and pricing data
- Headers in first row: Country, Zone, Weight (lb), Weight (kg), Air Freight, Injection, etc.
- See [Sheet Structure](#sheet-structure) section for details

---

## Maintenance & Updates

### Updating Pricing Data

**No code changes needed!** Simply update your Google Sheet:

1. Open your Google Sheet
2. Update prices, weights, or shipping lines
3. Changes are automatically reflected (cached for 30 minutes)
4. To force refresh, clear cache or wait 30 minutes

### Adding New Shipping Lines

1. **In Google Sheet:**
   - Create a new tab with shipping line name (e.g., "Express Pricing")
   - Follow the same structure as existing tabs
   - Add country, zone, weight, and pricing data

2. **Backend automatically detects:**
   - New tabs are automatically processed
   - Shipping lines are extracted from tab names
   - No code changes required

### Adding New Countries

1. **In Google Sheet:**
   - Add the country name in the "Country" column
   - Add corresponding weight bands and pricing
   - For countries with zones, add zone names in "Zone" column

2. **Backend automatically:**
   - Detects new countries from all tabs
   - Adds them to the country list
   - Makes them available in the dropdown

### Updating Code

**Backend (Railway):**
- Push changes to GitHub
- Railway automatically redeploys
- Or manually trigger deployment in Railway dashboard

**Frontend (Vercel):**
- Push changes to GitHub
- Vercel automatically redeploys
- Or manually trigger deployment in Vercel dashboard

### Clearing Cache

**Backend Cache:**
- Cache automatically expires after 30 minutes (sheet data)
- Cache expires after 1 hour (sheet names)
- To force refresh, restart the Railway service:
  1. Go to Railway dashboard
  2. Click on your service
  3. Click "Settings" → "Restart"

---

## Sheet Structure

### Required Columns

Your Google Sheet tabs should have these columns (in any order):
- **Country**: Destination country name
- **Zone**: Zone name (optional, only for countries with zones like Australia)
- **Weight (lb)**: Weight in pounds
- **Weight (kg)**: Weight in kilograms
- **Air Freight**: Freight cost per unit
- **Injection**: Injection fee
- **Transit Time** or **Delivery Time**: Delivery estimate (optional)

### Tab Naming

- Tabs ending with "Pricing" contain weight lists and pricing data
- Other tabs can contain transit time information
- Tab names are used to extract shipping line names

### Example Structure

```
| Country      | Zone | Weight (lb) | Weight (kg) | Air Freight | Injection |
|--------------|------|-------------|-------------|-------------|-----------|
| United States|      | 0.25        | 0.11        | 1.24        | 3.79      |
| United States|      | 0.5         | 0.23        | 1.48        | 3.79      |
```

---

## Quick Reference

### Backend URL
- Find in Railway: Settings → Networking → Public Domain

### Frontend URL
- Find in Vercel: Project → Domains

### Environment Variables Checklist

**Backend (Railway):**
- [ ] `GOOGLE_SHEET_ID`
- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` (full JSON as string)
- [ ] `PORT` (optional, defaults to 3001)
- [ ] `NODE_ENV=production`

**Frontend (Vercel):**
- [ ] `VITE_API_URL` (your Railway backend URL)

---

