# MediConnect Deployment Quick Reference

## 📋 Pre-Deployment Checklist

### MongoDB Atlas
- [ ] Account created
- [ ] Cluster created (M0 Free)
- [ ] Database user `mediconnect_user` created
- [ ] IP whitelist: 0.0.0.0/0 enabled
- [ ] Connection string copied
- [ ] Format: `mongodb+srv://mediconnect_user:PASSWORD@cluster0.xxxxx.mongodb.net/MediConnect?retryWrites=true&w=majority`

### Backend (Render Preparation)
- [ ] `.env.production` created from `.env.production.example`
- [ ] All required environment variables filled:
  - `MONGODB_URI` ✅
  - `ACCESS_TOKEN_SECRET` ✅
  - `REFRESH_TOKEN_SECRET` ✅
  - `TWILIO_*` credentials ✅
  - `EMAIL_USER` and `EMAIL_PASSWORD` ✅
  - `CLOUDINARY_*` credentials ✅
- [ ] `FRONTEND_URL` set to your Vercel domain (will get after frontend deploy)
- [ ] Pushed to GitHub main branch

### Frontend (Vercel Preparation)
- [ ] `.env.production` created from `.env.production.example`
- [ ] `VITE_API_URL` set to Render backend URL
- [ ] Pushed to GitHub main branch

### External Services
- [ ] Twilio account verified
- [ ] Twilio phone number verified
- [ ] Gmail app password generated (not regular password)
- [ ] Cloudinary account created and verified

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend (Render)
```
1. Go to render.com
2. Click "New Web Service"
3. Connect GitHub repository
4. Configure:
   - Name: mediconnect-backend
   - Runtime: Node
   - Build: npm install
   - Start: node app.js
5. Add Environment Variables (copy from .env.production)
6. Deploy
7. Get URL: https://mediconnect-backend.onrender.com
```

### Step 2: Update Frontend .env
```
Add to frontend/.env.production:
VITE_API_URL=https://mediconnect-backend.onrender.com
```

### Step 3: Deploy Frontend (Vercel)
```
1. Go to vercel.com
2. Click "Import Project"
3. Select GitHub repository
4. Configure:
   - Root Directory: frontend
   - Build: npm run build
   - Output: dist
5. Add Environment Variables:
   - VITE_API_URL = https://mediconnect-backend.onrender.com
6. Deploy
7. Get URL: https://mediconnect-frontend.vercel.app
```

### Step 4: Update Backend FRONTEND_URL
```
In Render dashboard:
1. Go to mediconnect-backend service
2. Settings → Environment Variables
3. Update FRONTEND_URL = https://mediconnect-frontend.vercel.app
4. Service auto-redeploys
```

---

## ✅ Post-Deployment Verification

### Test Backend
```bash
curl https://mediconnect-backend.onrender.com/
# Should return 200 OK
```

### Test Frontend
```
Open: https://mediconnect-frontend.vercel.app
Should load without errors
```

### Test Client Registration
```
1. Go to frontend
2. Sign up as Client
3. Enter email and phone
4. Verify OTP via email/SMS
5. Should be able to log in
```

### Test Doctor Registration
```
1. Go to frontend
2. Sign up as Doctor
3. Enter email and phone
4. Verify OTP via email/SMS
5. Should be able to log in
```

### Test Chat
```
1. Open two browser windows/tabs
2. Login as Client (one window) and Doctor (other window)
3. Create chat between them
4. Send messages
5. Messages should appear in real-time in both windows
```

### Test Video Call
```
1. Open two browser windows (or two different computers)
2. Login as Client and Doctor
3. Click "Call" in chat
4. Accept call on other side
5. Should see video stream from both sides
```

---

## 🔧 Troubleshooting

### Backend won't deploy to Render
```
1. Check Render logs: Dashboard → Service → Logs
2. Verify MongoDB connection string
3. Ensure app.js exists in backend root
4. Check all environment variables are set
```

### Frontend won't deploy to Vercel
```
1. Check Vercel logs: Dashboard → Project → Deployments
2. Ensure vite.config.js exists in frontend root
3. Check npm run build works locally: cd frontend && npm run build
4. Verify VITE_API_URL is correct
```

### "Cannot find API" error
```
1. Check frontend .env.production
2. Verify VITE_API_URL is correct (Render URL)
3. Check backend is running (green "Live" in Render)
4. Check CORS is configured in backend
```

### Socket connection fails
```
1. Ensure backend FRONTEND_URL matches Vercel URL
2. Check browser console for CORS errors
3. Verify socket.io transports: ['websocket', 'polling']
4. Check firewall isn't blocking websockets
```

### "Invalid Date" in messages
```
1. Ensure MongoDB is storing timestamps correctly
2. Verify backend time is synchronized (NTP)
3. Check message payload includes createdAt field
```

### Messages appearing twice
```
Already fixed - REST API handles save + broadcast
No need for additional socket emit
```

### Media toggle returns 400
```
1. Ensure currentCall is set before toggling
2. Check call status is 'ongoing', 'ringing', or 'initiated'
3. Verify callId is correct in API request
```

---

## 📊 Monitoring

### Uptime Monitoring (Free)
```
1. Go to uptimerobot.com
2. Create monitor for: https://mediconnect-backend.onrender.com
3. Set alert to email
4. Get notified if backend goes down
```

### Analytics
- **Backend**: Render Dashboard → Analytics
- **Frontend**: Vercel Dashboard → Analytics

### Logs
- **Backend**: Render Dashboard → Logs
- **Frontend**: Vercel Dashboard → Deployments → Logs

---

## 💾 Backups

### MongoDB
```
1. Go to MongoDB Atlas → Backups
2. Enable automatic daily backups (free)
3. Restore any point in last 7 days
```

### Code
```
GitHub is your backup for code
Push regularly: git push origin main
```

---

## 🔐 Security Checklist

- [ ] All passwords are strong (16+ chars, mixed case, numbers, symbols)
- [ ] JWT secrets are 32+ characters
- [ ] CORS is set to specific frontend URL (not *)
- [ ] Cookies are httpOnly and secure
- [ ] Email/SMS API keys are not in code
- [ ] Database credentials not in public files
- [ ] console.log statements removed from production code
- [ ] Rate limiting configured on API
- [ ] HTTPS enforced (automatic on Vercel/Render)

---

## 💰 Cost Estimation

| Service | Plan | Cost |
|---------|------|------|
| MongoDB Atlas | M0 Free | $0 |
| Render | Free | $0 |
| Vercel | Free | $0 |
| **TOTAL** | | **$0/month** |

**When scaling (optional):**
| Service | Plan | Cost |
|---------|------|------|
| MongoDB Atlas | M2 Starter | $9/month |
| Render | Starter | $7/month |
| Vercel | Pro | $20/month |
| **TOTAL** | | **$36/month** |

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Docs**: https://docs.mongodb.com
- **Socket.IO Docs**: https://socket.io/docs/

---

**Status: Ready to Deploy! 🎉**

Questions? Check DEPLOYMENT_GUIDE.md for detailed instructions.
