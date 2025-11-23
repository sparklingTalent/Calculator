# Vercel Frontend - Backend Connection Troubleshooting

## Common Issues and Solutions

### Issue: Frontend can't find backend API

#### 1. Check Environment Variable Name

**In Vercel, the variable MUST be named exactly:**
- `VITE_API_URL` (not `API_URL` or `REACT_APP_API_URL`)

Vite only exposes environment variables that start with `VITE_`.

#### 2. Check Environment Variable Value

**The value should be:**
- Your Railway backend URL (e.g., `https://your-app.up.railway.app`)
- **WITHOUT** trailing slash
- **WITHOUT** `/api` at the end

**Correct:**
```
https://shipping-calculator-production.up.railway.app
```

**Incorrect:**
```
https://shipping-calculator-production.up.railway.app/
https://shipping-calculator-production.up.railway.app/api
http://shipping-calculator-production.up.railway.app
```

#### 3. Set for All Environments

In Vercel Dashboard:
1. Go to your project → **Settings** → **Environment Variables**
2. Find `VITE_API_URL`
3. Make sure it's checked for:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development**

#### 4. Redeploy After Adding Variable

**Important:** After adding/changing environment variables:
1. Go to **Deployments** tab
2. Click the three dots (⋯) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

Vite embeds environment variables at **build time**, so you must rebuild after adding them.

#### 5. Verify Variable is Available

Add this temporarily to your `Calculator.jsx` to debug:

```jsx
// Add this at the top of the Calculator component
console.log('API_BASE_URL:', import.meta.env.VITE_API_URL);
console.log('All env vars:', import.meta.env);
```

Then check the browser console. You should see your Railway URL.

### Issue: CORS Errors

If you see errors like:
```
Access to XMLHttpRequest at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

**Solution:** The backend already has CORS enabled, but verify:

1. Check Railway backend logs - you should see requests coming in
2. Make sure your Railway URL is correct
3. The backend uses `app.use(cors())` which allows all origins

### Issue: Network Errors

If you see:
```
Network Error
ERR_CONNECTION_REFUSED
ERR_NAME_NOT_RESOLVED
```

**Check:**
1. Is your Railway backend actually running? Check Railway logs
2. Is the URL correct? Test it directly:
   ```bash
   curl https://your-app.up.railway.app/api/health
   ```
3. Does the URL include `https://`? (not `http://`)

### Issue: 404 Errors

If you see:
```
GET https://your-app.up.railway.app/api/shipping-channels 404
```

**Check:**
1. The backend routes are at `/api/*` - make sure your URL doesn't have `/api` twice
2. Test the backend directly:
   ```bash
   curl https://your-app.up.railway.app/api/health
   ```
   Should return: `{"status":"ok",...}`

### Step-by-Step Fix

1. **Get your Railway backend URL:**
   - Railway Dashboard → Your Service → Settings → Networking
   - Copy the domain (e.g., `https://shipping-calculator.up.railway.app`)

2. **Set in Vercel:**
   - Vercel Dashboard → Your Project → Settings → Environment Variables
   - Click **Add New**
   - **Name**: `VITE_API_URL`
   - **Value**: Your Railway URL (no trailing slash)
   - **Environments**: Select all (Production, Preview, Development)
   - Click **Save**

3. **Redeploy:**
   - Go to **Deployments**
   - Click **⋯** on latest deployment → **Redeploy**
   - Or push a new commit

4. **Verify:**
   - Open your Vercel site
   - Open browser DevTools (F12) → Console tab
   - Check for any errors
   - Look for the API calls in Network tab

### Testing the Connection

1. **Test backend directly:**
   ```bash
   curl https://your-railway-url.up.railway.app/api/health
   ```
   Should return: `{"status":"ok","timestamp":"...","sheetsConfigured":true}`

2. **Test from browser console:**
   ```javascript
   fetch('https://your-railway-url.up.railway.app/api/health')
     .then(r => r.json())
     .then(console.log)
   ```

3. **Check Vercel build logs:**
   - Vercel Dashboard → Your Deployment → Build Logs
   - Look for any errors during build

### Quick Debug Checklist

- [ ] Environment variable is named `VITE_API_URL` (not `API_URL`)
- [ ] Value is your Railway URL with `https://` (not `http://`)
- [ ] No trailing slash in the URL
- [ ] Variable is set for all environments (Production, Preview, Development)
- [ ] Redeployed after adding/changing the variable
- [ ] Railway backend is running (check Railway logs)
- [ ] Backend URL is accessible (test with curl)
- [ ] Browser console shows the correct API_BASE_URL

### Still Not Working?

1. **Check browser console** for specific error messages
2. **Check Network tab** in DevTools to see what URL is being called
3. **Check Vercel build logs** to see if the variable was available during build
4. **Check Railway logs** to see if requests are reaching the backend

