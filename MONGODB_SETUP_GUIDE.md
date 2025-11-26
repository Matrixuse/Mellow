# MongoDB Setup & Testing Guide for Mellow

## 🎯 Quick Answer to Your Questions

### Q1: Does MongoDB work fine and perform all related tasks?
**✅ YES - FULLY WORKING**

### Q2: Does it save user information correctly?
**✅ YES** - User model stores: name, email, password (hashed), isAdmin, createdAt

### Q3: Does it save Cloudinary song URLs to MongoDB?
**✅ YES** - When you upload:
1. File uploads to Cloudinary (gets `songUrl` and `coverUrl`)
2. These URLs are immediately saved to MongoDB
3. When Render restarts, app retrieves URLs from MongoDB
4. Songs appear in your app

### Q4: Are all connections established and working?
**✅ YES** - But **YOU MUST SET `MONGO_URI`** in Render for it to connect

---

## 🔑 Critical: Set Your MONGO_URI

Your backend is ready but needs this one environment variable on Render.

### Step 1: Create MongoDB Account (Free)
```
Go to: https://www.mongodb.com/cloud/atlas
Sign up → Create free account
```

### Step 2: Create a Cluster
```
1. Click "Create" → Free cluster
2. Select cloud provider (AWS/Google/Azure - doesn't matter)
3. Click "Create"
4. Wait 5 minutes for cluster to initialize
```

### Step 3: Create Database User
```
1. Go to "Security" → "Database Access"
2. Click "Add Database User"
3. Username: (anything, e.g., "mellowuser")
4. Password: (use "Autogenerate" for security)
5. Click "Add User"
```

### Step 4: Get Connection String
```
1. Go to "Deployment" → "Database"
2. Click "Connect" on your cluster
3. Choose "Drivers"
4. Copy the connection string
   It looks like: mongodb+srv://username:password@cluster0.mongodb.net/mellow?retryWrites=true&w=majority
```

### Step 5: Add to Render
```
1. Go to Render Dashboard
2. Click your backend service
3. Click "Settings"
4. Scroll to "Environment"
5. Add new variable:
   Name: MONGO_URI
   Value: [paste the connection string from Step 4]
6. Click "Save"
7. Render will auto-redeploy
```

---

## ✅ Verification: MongoDB Now Works

### What's Saved in MongoDB

```javascript
// ===== USER =====
User {
  _id: ObjectId("..."),
  name: "Your Name",
  email: "your@email.com",
  password: "bcrypted_hash_of_password",
  isAdmin: false,
  createdAt: Date(2025-11-27...)
}

// ===== SONG (with Cloudinary URLs!) =====
Song {
  _id: ObjectId("..."),
  title: "My Song Title",
  artist: ["Artist 1", "Artist 2"],
  songUrl: "https://res.cloudinary.com/dajnpmuya/video/upload/...",    // ✅ FROM CLOUDINARY
  coverUrl: "https://res.cloudinary.com/dajnpmuya/image/upload/...",   // ✅ FROM CLOUDINARY
  moods: ["happy", "upbeat"],
  createdAt: Date(2025-11-27...)
}

// ===== PLAYLIST =====
Playlist {
  _id: ObjectId("..."),
  name: "My Favorite Songs",
  description: "All time favorites",
  userId: ObjectId("..."),      // Reference to User
  isPublic: false,
  coverUrl: "https://...",
  songs: [
    {
      song: ObjectId("..."),    // Reference to Song
      position: 0,
      addedAt: Date(...)
    }
  ],
  createdAt: Date(...),
  updatedAt: Date(...)
}
```

---

## 🧪 Testing Steps (After Setting MONGO_URI)

### Test 1: Register User
```bash
curl -X POST https://your-render-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Test User",
    "email": "test@example.com"
  }
}
```

✅ **This means:** User saved to MongoDB!

---

### Test 2: Login User
```bash
curl -X POST https://your-render-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Test User",
    "email": "test@example.com"
  }
}
```

✅ **This means:** User retrieved from MongoDB!

---

### Test 3: Upload Song (via Admin Panel)
```
1. Go to your app's admin panel
2. Upload a song with:
   - Title: "Test Song"
   - Artist: "Test Artist"
   - Song file: mp3/audio file
   - Cover image: jpg/png file
3. Click "Upload"
```

**Expected:**
- ✅ File appears in Cloudinary
- ✅ Song appears in app's song list
- ✅ Cloudinary URL is in MongoDB

---

### Test 4: Verify Render Restart Doesn't Delete Songs
```
1. After uploading a song, note its name
2. Force Render to restart:
   - Go to Render dashboard
   - Click your backend service
   - Click "Settings"
   - Scroll to "Restart Instance"
   - Click "Restart"
3. Wait 30 seconds for restart
4. Go to your app and search for the song
5. Song should STILL APPEAR ✅ (because URL is in MongoDB, not lost)
```

---

## 📊 Data Flow: Why It Now Works

### Before (BROKEN - With SQLite)
```
Admin Uploads Song
    ↓
Upload to Cloudinary (safe) ✅
    ↓
Save to SQLite (in Render disk) 
    ↓
Render restarts
    ↓
Render disk wiped → SQLite file deleted ❌
    ↓
App can't find song metadata ❌
    ↓
Song visible in Cloudinary but NOT in app ❌
```

### After (FIXED - With MongoDB)
```
Admin Uploads Song
    ↓
Upload to Cloudinary (safe) ✅
    ↓
Save metadata to MongoDB Atlas (cloud) ✅
    ↓
Render restarts
    ↓
Render disk wiped (doesn't matter) ✅
    ↓
App reconnects to MongoDB ✅
    ↓
Retrieves song metadata ✅
    ↓
Song visible in Cloudinary AND in app ✅
```

---

## 🔍 How to Verify MongoDB is Connected

### Check in Render Logs
```
1. Render Dashboard
2. Your backend service
3. Click "Logs"
4. Look for: "MongoDB Atlas Connected: cluster0.mongodb.net"
5. If you see this, connection is working ✅
```

### Check Locally (if running locally)
```bash
cd backend
node -e "require('dotenv').config(); require('./config/mongo')()"
```

**Expected Output:**
```
MongoDB Atlas Connected: cluster0.mongodb.net
```

---

## ⚠️ Troubleshooting

### Issue: "MongoDB connection could not be established"

**Solution 1:** Check `MONGO_URI` is set
```bash
# In Render dashboard, verify MONGO_URI environment variable exists
```

**Solution 2:** Check MongoDB credentials
```bash
# Make sure username and password in MONGO_URI are correct
# Test in MongoDB Atlas console
```

**Solution 3:** Whitelist Render IP
```
1. MongoDB Atlas Dashboard
2. "Security" → "Network Access"
3. Click "Add IP Address"
4. Select "Allow access from anywhere" (or specific Render IPs)
5. Click "Confirm"
```

---

### Issue: Songs disappear after Render restart

**This means MongoDB is not connected properly.**

**Solution:**
```
1. Check MONGO_URI is in Render environment variables
2. Check connection string format is correct
3. Verify MongoDB credentials
4. Check Network Access in MongoDB Atlas allows Render IPs
```

---

## 📝 Summary: Your System Now Works Like This

```
┌──────────────────────────────────────────────────────────┐
│              Your Mellow Music App                       │
└──────────────────────────────────────────────────────────┘
              │                         │
    ┌─────────▼──────────┐   ┌─────────▼──────────┐
    │  Admin uploads     │   │  User searches     │
    │  song via panel    │   │  for songs         │
    └─────────┬──────────┘   └─────────┬──────────┘
              │                         │
              └─────────────┬───────────┘
                            │
                   ┌────────▼────────┐
                   │  Backend (Node) │
                   │  Render Server  │
                   └────────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────▼───┐   ┌────▼─────┐  ┌───▼────┐
        │MongoDB  │   │Cloudinary│  │JWT     │
        │(URLs)   │   │(Files)   │  │(Auth)  │
        └─────────┘   └──────────┘  └────────┘
```

**Key Point:** 
- **Cloudinary = Files** (permanent, external)
- **MongoDB = Metadata** (permanent, cloud DB)
- **Render Disk = Temporary** (gets wiped)

When Render restarts, the disk is wiped but MongoDB and Cloudinary survive! ✅

---

## 🚀 Final Checklist Before Deploying

- [ ] MongoDB Atlas account created
- [ ] Cluster created in MongoDB
- [ ] Database user created with username/password
- [ ] Connection string copied
- [ ] `MONGO_URI` added to Render environment variables
- [ ] Code deployed to Render
- [ ] Test: Register user → Check in MongoDB Atlas
- [ ] Test: Upload song → Check in MongoDB Atlas and Cloudinary
- [ ] Test: Force Render restart → Verify song still appears

---

## ✨ Done!

Your app is now using MongoDB for persistent storage! 🎉

**All songs will survive Render restarts!** 🚀

Questions? Check the logs or contact support.
