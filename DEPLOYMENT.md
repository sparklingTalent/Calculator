# Deployment Guide

This guide covers deploying the Shipping Cost Calculator to production.

## Quick Start

1. **Install dependencies**: `npm run install:all`
2. **Configure environment**: Copy `.env.example` to `.env` and fill in values
3. **Run locally**: `npm run dev`
4. **Build for production**: `cd frontend && npm run build`

## Backend Deployment

### Option 1: Railway (Recommended)

1. Create account at [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Select your repository
4. **Configure Build Settings:**
   - Railway will automatically detect the `railway.json` configuration
   - Build command: `npm run build` (installs frontend deps and builds)
   - Start command: `cd backend && npm start`
5. Add environment variables:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_KEY` (paste JSON content or use file upload)
   - `PORT` (Railway sets this automatically)
6. Deploy!

### Option 2: Render

1. Create account at [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repository
4. Settings:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
5. Add environment variables (same as Railway)
6. Deploy

### Option 3: Heroku

```bash
# Install Heroku CLI
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set GOOGLE_SHEET_ID=your-id
heroku config:set GOOGLE_SHEET_RANGE=Sheet1!A1:Z1000

# For service account key, use base64 encoding
cat service-account-key.json | base64 | pbcopy
heroku config:set GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=<paste>

# Deploy
git push heroku main
```

### Option 4: DigitalOcean App Platform

1. Create app from GitHub
2. Configure:
   - **Build Command**: `cd backend && npm install`
   - **Run Command**: `cd backend && npm start`
3. Add environment variables
4. Deploy

## Frontend Deployment

### Option 1: Netlify (Recommended)

1. Build: `cd frontend && npm run build`
2. Drag & drop `frontend/dist` folder to [netlify.com](https://netlify.com)
3. Or connect GitHub and set:
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Publish directory**: `frontend/dist`
4. Add environment variable:
   - `VITE_API_URL` = your backend URL

### Option 2: Vercel (Recommended for Frontend)

#### Method 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Navigate to frontend directory:
```bash
cd frontend
```

3. Deploy:
```bash
vercel
```

4. Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No** (for first time)
   - Project name? (Press Enter for default)
   - Directory? **./** (current directory)
   - Override settings? **No**

5. Add environment variable in Vercel Dashboard:
   - Go to your project → Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-railway-backend-url.railway.app`

6. Redeploy to apply environment variable:
```bash
vercel --prod
```

#### Method 2: Deploy via GitHub Integration (Recommended)

1. Push your code to GitHub (if not already)

2. Go to [vercel.com](https://vercel.com) and sign in

3. Click **Add New Project**

4. Import your GitHub repository

5. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

6. Add Environment Variable:
   - **Name**: `VITE_API_URL`
   - **Value**: Your Railway backend URL (e.g., `https://your-app.railway.app`)
   - **Environment**: Production, Preview, Development (select all)

7. Click **Deploy**

8. Vercel will automatically deploy on every push to your main branch!

#### Vercel Configuration

The `frontend/vercel.json` file is already configured with:
- Build command
- Output directory
- SPA routing (all routes redirect to index.html)
- Framework detection

#### Custom Domain (Optional)

1. Go to your project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Option 3: GitHub Pages

1. Update `vite.config.js`:
```js
base: '/your-repo-name/'
```

2. Build and deploy:
```bash
cd frontend
npm run build
# Deploy dist/ folder to gh-pages branch
```

## Embedding in Webflow

### Method 1: Iframe (Easiest)

1. Deploy frontend to Netlify/Vercel
2. In Webflow:
   - Add an **Embed** element
   - Paste:
```html
<iframe 
  src="https://your-calculator.netlify.app" 
  width="100%" 
  height="800px" 
  frameborder="0"
  style="border-radius: 12px; border: none;">
</iframe>
```

### Method 2: Custom Code Embed

1. Build frontend: `cd frontend && npm run build`
2. Host `dist/` folder
3. In Webflow, add **Custom Code** in page settings:
```html
<div id="shipping-calculator-root"></div>
<script type="module" crossorigin src="https://your-domain.com/assets/index-[hash].js"></script>
<link rel="stylesheet" href="https://your-domain.com/assets/index-[hash].css">
```

### Method 3: Script Tag (Standalone)

Create a standalone HTML file that can be embedded:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Shipping Calculator</title>
</head>
<body>
  <div id="root"></div>
  <script>
    // Inline your built JS/CSS or load from CDN
  </script>
</body>
</html>
```

## Environment Variables Reference

### Backend (.env)

```env
GOOGLE_SHEET_ID=1abc123def456ghi789
GOOGLE_SHEET_RANGE=Sheet1!A1:Z1000
GOOGLE_SERVICE_ACCOUNT_KEY=./service-account-key.json
PORT=3001
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend (.env)

```env
VITE_API_URL=https://your-backend.railway.app
```

## Google Sheets Setup

1. **Create Sheet** with columns:
   - Zone
   - Country
   - Standard
   - Express
   - Fulfillment

2. **Share with Service Account**:
   - Open service account JSON file
   - Copy the `client_email` value
   - In Google Sheets: Share → Add email → Viewer access

3. **Get Sheet ID**:
   - From URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Copy `SHEET_ID` part

## CORS Configuration

For production, update backend CORS:

```js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://your-frontend.com',
  credentials: true
}));
```

## Performance Optimization

1. **Enable Caching**: Already implemented (5 min TTL)
2. **CDN**: Use Cloudflare for static assets
3. **Compression**: Enable gzip on server
4. **Image Optimization**: If adding images, use WebP format

## Monitoring

### Health Check

Monitor: `GET https://your-backend.com/api/health`

### Error Tracking

Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for usage stats

## SSL/HTTPS

All production deployments should use HTTPS:
- Netlify/Vercel: Automatic
- Railway/Render: Automatic
- Custom servers: Use Let's Encrypt

## Troubleshooting

### Backend won't start
- Check environment variables
- Verify Google Sheets API access
- Check server logs

### Frontend can't connect
- Verify `VITE_API_URL` is correct
- Check CORS settings
- Test backend `/api/health` endpoint

### Calculations fail
- Verify Google Sheet structure
- Check service account permissions
- Review backend logs

## Support

For deployment issues:
1. Check server logs
2. Verify environment variables
3. Test API endpoints manually
4. Review Google Sheets permissions

