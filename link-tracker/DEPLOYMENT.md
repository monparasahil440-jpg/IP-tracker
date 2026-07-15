# Vercel Deployment Guide

## Issues Fixed

The project now works on Vercel with the following changes:

### 1. Serverless Function Architecture
- Created `api/index.js` - Handles root route and static files for link tracker
- Created `api/ip-tracker.js` - Handles IP tracker routes and static files
- Updated `vercel.json` - Proper routing configuration

### 2. Static File Serving
- Both serverless functions now serve static files with proper content types
- Security checks to prevent directory traversal
- Support for CSS, JS, HTML files

### 3. Path Fixes
- Updated `index.html` to use relative paths instead of absolute `/ip-tracker/` paths
- CSS and JS now load correctly on Vercel

## Deployment Steps

### 1. Set Environment Variables (Optional but Recommended)

For persistent storage on Vercel, add Redis KV:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `KV_REST_API_URL` - Your Redis KV URL
   - `KV_REST_API_TOKEN` - Your Redis KV token
   - `BASE_URL` - Your deployed URL (e.g., `https://your-project.vercel.app`)

Without Redis, data will be stored in `/tmp` (ephemeral, lost between deployments).

### 2. Deploy to Vercel

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy from link-tracker directory
cd "d:\IP tracker\link-tracker"
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### 3. Test the Deployment

1. **Link Tracker**: Visit `https://your-project.vercel.app/`
2. **IP Tracker**: Visit `https://your-project.vercel.app/ip-tracker`
3. **Create Link**: Use the form or API endpoint
4. **Test Redirect**: Create a link and test the redirect flow

## Important Notes

### Storage Limitations
- **Without Redis**: Data stored in `/tmp` is lost between deployments
- **With Redis**: Data persists across deployments
- Links still work without storage due to stateless ID encoding

### API Endpoints
- `POST /api/create` - Create tracking link
- `GET /api/admin?id=xxx` - View link analytics
- `POST /api/collect` - Consent-based data collection
- `GET /api/links` - List all links
- `DELETE /api/delete?id=xxx` - Delete link
- `GET /r/:id` - Redirect with consent page

### Static Files
- CSS: `styles.css`, `styles-link-sharing.css`
- JS: `main.js`, `admin.js`, `script.js`
- HTML: `index.html`, `admin.html`

## Troubleshooting

### Links not redirecting
- Check Vercel deployment logs
- Verify `vercel.json` routing rules
- Ensure API functions are deployed

### Static files not loading
- Check browser console for 404 errors
- Verify path rewrites in `vercel.json`
- Check content-type headers

### Data not persisting
- Add Redis KV environment variables
- Verify Redis connection in deployment logs
- Check that data is being saved to Redis

### CORS errors
- CORS headers are configured in `vercel.json`
- Check browser console for specific errors
- Verify API endpoint URLs
