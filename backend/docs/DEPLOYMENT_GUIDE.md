# MediConnect Deployment Guide
## Frontend (Vercel) + Backend (Render) + Database (MongoDB Atlas)

---

## PART 1: MongoDB Atlas Setup (Database)

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up with Google or Email
3. Create a free organization and project

### Step 2: Create a Cluster
1. Click "Create a Deployment"
2. Select **Free** tier (M0 Sandbox)
3. Select provider: **AWS**
4. Select region closest to you
5. Click "Create Deployment"
6. Wait 1-3 minutes for cluster initialization

### Step 3: Set Database Credentials
1. Go to **Database Access** → **Add New Database User**
2. Create username: `mediconnect_user`
3. Create strong password: `YourStrongPassword123!`
4. Select **Built-in Role**: `Atlas admin`
5. Click "Add User"

### Step 4: Whitelist IP Address
1. Go to **Network Access**
2. Click "Add IP Address"
3. Select "Allow access from anywhere" (0.0.0.0/0) for development
   > *Note: For production, specify exact IPs of Render servers*
4. Click "Confirm"

### Step 5: Get Connection String
1. Go back to **Clusters** → Click "Connect"
2. Select "Drivers"
3. Choose **Node.js** version **4.x or later**
4. Copy connection string:
   ```
   mongodb+srv://mediconnect_user:YourStrongPassword123!@cluster0.xxxxx.mongodb.net/MediConnect?retryWrites=true&w=majority
   ```

---

## PART 2: Backend Deployment on Render

### Step 1: Prepare Backend for Production

#### 1.1: Update Environment Variables
Create `.env.production` in backend root:

```
# Server
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://mediconnect_user:YourStrongPassword123!@cluster0.xxxxx.mongodb.net/MediConnect?retryWrites=true&w=majority
DB_NAME=MediConnect

# JWT Secrets
ACCESS_TOKEN_SECRET=your_super_secret_jwt_key_min_32_chars_long_12345
REFRESH_TOKEN_SECRET=your_super_secret_refresh_key_min_32_chars_long_12345

# Authentication
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email (Gmail)
EMAIL_USER=mediconnect12@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# Cloudinary
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# CORS
FRONTEND_URL=https://your-vercel-frontend-url.vercel.app
ALLOWED_ORIGINS=https://your-vercel-frontend-url.vercel.app,http://localhost:3000

# Cookies (Production)
COOKIE_SECURE=true
COOKIE_SAMESITE=Lax
COOKIE_DOMAIN=your-render-backend-url.onrender.com
```

#### 1.2: Update Cookies for Production
In `backend/src/controllers/client.controllers.js` and `doctor.controllers.js`:

Change cookie options:
```javascript
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // true on Render, false locally
  sameSite: process.env.NODE_ENV === 'production' ? 'Lax' : 'Lax',
  domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};
```

#### 1.3: Create Render Web Service
1. Go to https://render.com
2. Sign up with GitHub (easier deployment)
3. Click "New Web Service"
4. GitHub: Select your repo
5. Configure:
   - **Name**: `mediconnect-backend`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node app.js`

#### 1.4: Add Environment Variables on Render
1. Scroll to **Environment** section
2. Click "Add Environment Variable" for each:

```
NODE_ENV = production
MONGODB_URI = mongodb+srv://mediconnect_user:YourStrongPassword123!@cluster0.xxxxx.mongodb.net/MediConnect?retryWrites=true&w=majority
ACCESS_TOKEN_SECRET = your_super_secret_jwt_key_min_32_chars_long_12345
REFRESH_TOKEN_SECRET = your_super_secret_refresh_key_min_32_chars_long_12345
TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN = your_twilio_auth_token
TWILIO_PHONE_NUMBER = +1234567890
EMAIL_USER = mediconnect12@gmail.com
EMAIL_PASSWORD = your_gmail_app_password
CLOUDINARY_NAME = your_cloudinary_name
CLOUDINARY_API_KEY = your_cloudinary_api_key
CLOUDINARY_API_SECRET = your_cloudinary_api_secret
```

#### 1.5: Deploy
1. Click "Create Web Service"
2. Deployment starts (takes 2-5 minutes)
3. You'll get a URL like: `https://mediconnect-backend.onrender.com`
4. Wait for "Live" status

### Step 2: Update Frontend API URL

---

## PART 3: Frontend Deployment on Vercel

### Step 1: Prepare Frontend for Production

#### 1.1: Update Vite Config
In `frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps in production
  },
  define: {
    'process.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'http://localhost:5000'
    ),
  },
})
```

#### 1.2: Create `.env.production` for Frontend
In `frontend` root:

```
VITE_API_URL=https://mediconnect-backend.onrender.com
```

#### 1.3: Update Frontend Components
Update API calls in `frontend/utils/axois.js`:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
});
```

Update socket connection in `frontend/lib/socket.js`:

```javascript
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const createSocket = (token, userType, userId) => {
  return io(SOCKET_URL, {
    withCredentials: true,
    auth: { token, userType, userId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });
};
```

### Step 2: Deploy to Vercel

#### 2.1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import your repository

#### 2.2: Configure Vercel Project
1. Click "Import Project"
2. Select your MediConnect GitHub repo
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### 2.3: Add Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   VITE_API_URL = https://mediconnect-backend.onrender.com
   ```
3. Select environment: **Production**

#### 2.4: Deploy
1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. You'll get a URL like: `https://mediconnect-frontend.vercel.app`

---

## PART 4: Verification & Testing

### Checklist:

- [ ] MongoDB Atlas cluster is running
- [ ] Render backend shows "Live" status
- [ ] Vercel frontend shows deployment success
- [ ] Backend URL: `https://mediconnect-backend.onrender.com`
- [ ] Frontend URL: `https://mediconnect-frontend.vercel.app`

### Test Endpoints:

1. **Backend Health Check**
   ```
   GET https://mediconnect-backend.onrender.com/
   ```
   Should return 200 OK

2. **Frontend Load**
   ```
   Open https://mediconnect-frontend.vercel.app
   ```
   Should load without errors

3. **Client Registration**
   - Go to frontend
   - Sign up as Client
   - Verify OTP email/SMS received

4. **Doctor Registration**
   - Go to frontend
   - Sign up as Doctor
   - Verify OTP email/SMS received

5. **Chat Functionality**
   - Login as Client and Doctor
   - Create chat between them
   - Send messages
   - Verify real-time updates

6. **Video Call**
   - Login on two different browsers
   - Initiate video call
   - Verify WebRTC connection

---

## PART 5: Troubleshooting

### Backend won't start on Render
**Solution:**
- Check Render logs: Dashboard → Select service → Logs
- Verify MongoDB connection string
- Ensure all environment variables are set
- Check `app.js` for syntax errors

### Frontend shows "Cannot find API"
**Solution:**
- Check VITE_API_URL is correct in Vercel env vars
- Verify backend is running and accessible
- Check browser Console for CORS errors

### Socket connection fails
**Solution:**
- Ensure `FRONTEND_URL` is set correctly in backend `.env`
- Check CORS policy in backend:
  ```javascript
  const cors = require('cors');
  app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }));
  ```

### MongoDB connection timeout
**Solution:**
- Go to MongoDB Atlas → Network Access
- Ensure "Allow from anywhere" (0.0.0.0/0) is enabled
- Check database user credentials
- Verify connection string format

### Email/SMS not sending
**Solution:**
- Verify Gmail app password (not regular password)
- Check Twilio credentials and balance
- Test with hardcoded values in development first

---

## PART 6: Post-Deployment Optimization

### 1. Enable MongoDB Backups
- MongoDB Atlas dashboard → Backups
- Enable daily automated backups (free)

### 2. Monitor Backend Performance
- Render dashboard → Analytics
- Monitor response times and errors

### 3. Enable Vercel Analytics
- Vercel dashboard → Analytics
- Track frontend performance

### 4. Set Up Status Monitoring
Option A: Use Uptime Robot (free)
- Go to https://uptimerobot.com
- Monitor: `https://mediconnect-backend.onrender.com/`
- Get alerts if backend goes down

Option B: Use Better Uptime (free tier)
- https://betteruptime.com

---

## PART 7: Scaling to Production

When ready for scale:

### Upgrade MongoDB
- Change from M0 (free) to M2/M5 (paid)
- Enable sharding for horizontal scale

### Upgrade Backend (Render)
- Starter plan ($7/month) - suitable for small apps
- Standard plan ($12/month) - for medium traffic

### Upgrade Frontend (Vercel)
- Pro plan ($20/month) - get priority support and advanced analytics
- Enterprise - custom needs

---

## PART 8: Security Checklist

Before going LIVE:

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (min 32 chars)
- [ ] Enable HTTPS (automatic on Vercel/Render)
- [ ] Set CORS to specific frontend URL only
- [ ] Remove console.logs from production
- [ ] Enable rate limiting on API endpoints
- [ ] Set cookies to `secure: true` and `httpOnly: true`
- [ ] Use environment-specific secrets
- [ ] Enable MongoDB authentication
- [ ] Regular security audits

---

## PART 9: CI/CD Pipeline (Optional)

For automatic deployments on every push:

### GitHub Actions (Backend to Render)
Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to Render

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Trigger Render deployment
        run: curl ${{ secrets.RENDER_DEPLOY_URL }}
```

Add `RENDER_DEPLOY_URL` to GitHub secrets.

### Vercel Auto-Deploy
Vercel automatically deploys when you push to main branch ✅

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **Socket.io Production**: https://socket.io/docs/v4/socket-io-protocol/

---

## Summary

| Component | Service | Plan | Cost |
|-----------|---------|------|------|
| Backend | Render | Free | $0 |
| Frontend | Vercel | Free | $0 |
| Database | MongoDB Atlas | Free (M0) | $0 |
| **TOTAL** | - | - | **$0/month** |

Once you have traffic and need scale:
- Render Starter: $7/month
- MongoDB M2: $9/month
- Vercel Pro: $20/month
- **New Total**: ~$36/month

---

**Deployment Complete! Your telemedicine app is now LIVE 🚀**
