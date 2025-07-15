# PumpFunds Frontend Deployment Guide

## 🚀 Quick Deployment to Vercel

### 1. **Update Backend URL**
Edit `client/vercel.json` and replace the `VITE_API_URL` with your actual Railway backend URL:

```json
{
  "env": {
    "VITE_API_URL": "https://YOUR-ACTUAL-RAILWAY-URL.up.railway.app/api"
  }
}
```

### 2. **Deploy to Vercel**

**Option A: One-Click Deploy**
1. Push this code to GitHub (already done)
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository
5. Set **Root Directory** to `client`
6. Click "Deploy"

**Option B: Vercel CLI**
```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to client directory
cd client

# Deploy
vercel --prod
```

### 3. **Alternative: Deploy to Netlify**

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import from Git"
3. Select your repository
4. Set:
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`
5. Add environment variables:
   - `VITE_API_URL`: `https://YOUR-RAILWAY-URL.up.railway.app/api`
   - `VITE_SOLANA_RPC_URL`: `https://api.devnet.solana.com`

### 4. **Alternative: Deploy to Railway (as separate service)**

1. Create new Railway service
2. Connect to same GitHub repo
3. Set **Root Directory** to `client`
4. Add environment variables in Railway dashboard
5. Deploy

## 🔧 Environment Variables Needed

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://your-backend.up.railway.app/api` | Your backend API URL |
| `VITE_SOLANA_RPC_URL` | `https://api.devnet.solana.com` | Solana RPC endpoint |
| `VITE_NODE_ENV` | `production` | Environment |

## ✅ After Deployment

1. Visit your frontend URL
2. Test the login/register functionality
3. Verify API calls are working
4. Check Solana wallet integration

## 🏗️ Build Locally (Optional)

```bash
cd client
npm install
npm run build
npm run preview
```

## 🔗 Expected URLs

- **Frontend:** `https://your-app.vercel.app`
- **Backend API:** `https://your-backend.up.railway.app/api`
- **Health Check:** `https://your-backend.up.railway.app/health` 