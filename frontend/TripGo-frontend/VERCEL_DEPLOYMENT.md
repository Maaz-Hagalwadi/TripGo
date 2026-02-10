# Vercel Deployment Guide

## Prerequisites
- Vercel account
- Backend API deployed and accessible

## Deployment Steps

### 1. Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

### 2. Configure Environment Variables in Vercel

Go to your Vercel project settings and add:

```
VITE_API_BASE_URL=https://your-backend-api.com
```

**Important:** Replace `https://your-backend-api.com` with your actual backend URL.

### 3. Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Set root directory to: `frontend/TripGo-frontend`
5. Framework Preset: **Vite**
6. Build Command: `npm run build`
7. Output Directory: `dist`
8. Add environment variable: `VITE_API_BASE_URL`
9. Click "Deploy"

### 4. Deploy via CLI

```bash
cd frontend/TripGo-frontend
vercel
```

Follow the prompts and set environment variables when asked.

### 5. Set Environment Variables via CLI

```bash
vercel env add VITE_API_BASE_URL
```

Enter your backend API URL when prompted.

## Post-Deployment

### Update Backend CORS

Make sure your backend allows requests from your Vercel domain:

```java
// Example for Spring Boot
@CrossOrigin(origins = {"https://your-app.vercel.app"})
```

### Test the Deployment

1. Visit your Vercel URL
2. Try logging in
3. Check browser console for any API errors
4. Verify all features work correctly

## Troubleshooting

### API calls failing
- Check `VITE_API_BASE_URL` is set correctly in Vercel
- Verify backend CORS settings
- Check backend is accessible from Vercel

### 404 on page refresh
- `vercel.json` should handle SPA routing (already configured)

### Environment variables not working
- Rebuild the project after adding env vars
- Env vars must start with `VITE_` to be exposed to the client

## Automatic Deployments

Vercel automatically deploys:
- **Production**: When you push to `main` branch
- **Preview**: When you create a pull request

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update backend CORS to include custom domain
