# Architecture Diagrams - MongoDB Migration

## 1. Current Architecture (AFTER Migration) ✅

```
┌─────────────────────────────────────────────────────────────────┐
│                     Your Mellow Music App                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌──────────────────┐
│   Mobile App        │         │   Web App        │
│   (Ionic/React)     │         │   (React)        │
└──────────┬──────────┘         └────────┬─────────┘
           │                             │
           └─────────────────┬───────────┘
                             │
                    ┌────────▼────────┐
                    │  Express Backend│
                    │  (Node.js)      │
                    │  Render Server  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌──────▼──────┐      ┌────▼─────┐
    │ Cloudinary│      │ MongoDB     │      │  JWT     │
    │(Song Files)│      │ Atlas       │      │ (Auth)   │
    │Permanent ✅│      │(Persistent) │      │          │
    │CDN        │      │Cloud DB ✅  │      │          │
    └───────────┘      └─────────────┘      └──────────┘

DATA FLOW:
Upload → Cloudinary (file) + MongoDB (metadata with URL) → App displays with Cloudinary URL
Restart → MongoDB reconnected, URLs retrieved → App works ✅
```

---

## 2. Old Architecture (BEFORE Migration - BROKEN ❌)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Your Mellow Music App                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌──────────────────┐
│   Mobile App        │         │   Web App        │
│   (Ionic/React)     │         │   (React)        │
└──────────┬──────────┘         └────────┬─────────┘
           │                             │
           └─────────────────┬───────────┘
                             │
                    ┌────────▼────────┐
                    │  Express Backend│
                    │  (Node.js)      │
                    │  Render Server  │
                    │  Ephemeral ❌   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌──────▼──────┐      ┌────▼─────┐
    │ Cloudinary│      │ SQLite      │      │  JWT     │
    │(Song Files)│      │ (Local Disk)│      │ (Auth)   │
    │Permanent ✅│      │ Ephemeral ❌│      │          │
    │CDN        │      │ GETS WIPED  │      │          │
    │           │      │ ON RESTART  │      │          │
    └───────────┘      └─────────────┘      └──────────┘

PROBLEM:
Upload → Cloudinary (file) ✅ + SQLite (metadata) ✅
Restart → SQLite deleted ❌ + Cloudinary files safe ✅
Result → App can't find songs ❌ (even though files in Cloudinary)
```

---

## 3. Data Storage Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                  WHERE DATA IS STORED                          │
└─────────────────────────────────────────────────────────────────┘

CLOUDINARY (Song Files)
├─ MP3/audio files
├─ Cover images
├─ Location: AWS/Cloudinary servers
├─ Persistence: ✅ Forever (until deleted)
├─ Accessed via: HTTPS URLs
├─ Example URL: https://res.cloudinary.com/dajnpmuya/...
└─ On Render restart: ✅ Still there (external service)

MONGODB ATLAS (Metadata)
├─ User accounts
├─ Song information (title, artist, moods)
├─ Cloudinary URLs ✅ (THIS IS KEY!)
├─ Playlists
├─ User relationships
├─ Location: AWS/Google/Azure (managed)
├─ Persistence: ✅ Forever
└─ On Render restart: ✅ Still there (external service)

RENDER DISK (Ephemeral)
├─ Temporary files
├─ Node.js runtime
├─ Package cache
├─ OLD: SQLite database ❌
├─ Persistence: ❌ Wiped on restart
└─ On Render restart: ❌ Everything deleted

JWT TOKENS (In Memory)
├─ Short-lived authentication tokens
├─ Location: User's app (localStorage/sessionStorage)
├─ Persistence: Valid for 7 days (if stored)
└─ Can be regenerated anytime ✅
```

---

## 4. Song Upload Process - Detailed

```
┌──────────────────────────────────────────────────────────────────┐
│             SONG UPLOAD PROCESS (Complete Flow)                 │
└──────────────────────────────────────────────────────────────────┘

STEP 1: User Interacts
┌──────────────────────────────┐
│ Admin Panel                  │
│                              │
│ 1. Select song (mp3)         │
│ 2. Select cover (jpg/png)    │
│ 3. Enter title               │
│ 4. Enter artist(s)           │
│ 5. Select moods              │
│ 6. Click "Upload"            │
└──────────────┬───────────────┘
               │

STEP 2: Frontend Preparation
┌──────────────────────────────┐
│ React/Ionic Frontend         │
│                              │
│ 1. Create FormData object    │
│ 2. Append file and metadata  │
│ 3. Add JWT token to header   │
│ 4. Send POST request         │
└──────────────┬───────────────┘
               │ POST /api/songs/upload
               ▼
STEP 3: Backend Receives
┌──────────────────────────────┐
│ Express Server (Render)      │
│                              │
│ 1. Middleware validates JWT  │
│ 2. Extracts files from form  │
│ 3. Validates file types      │
│ 4. Checks file sizes         │
└──────────────┬───────────────┘
               │

STEP 4: Upload to Cloudinary
┌──────────────────────────────┐
│ Cloudinary Upload            │
│                              │
│ Song file (mp3)              │
│ ↓                            │
│ uploadFileToCloudinary()     │
│ ↓                            │
│ Returns:                     │
│ {                            │
│   secure_url: "https://...", │
│   public_id: "..."           │
│ }                            │
└──────────────┬───────────────┘
               │

STEP 5: Save Metadata to MongoDB ✅ (KEY STEP)
┌──────────────────────────────────────────┐
│ MongoDB Atlas                            │
│                                          │
│ Song.create({                            │
│   title: "My Song",                      │
│   artist: ["Artist"],                    │
│   songUrl: cloudinary_url ✅,            │
│   coverUrl: cloudinary_url ✅,           │
│   moods: ["happy"],                      │
│   createdAt: Date.now()                  │
│ })                                       │
│                                          │
│ ✅ Cloudinary URLs saved in MongoDB     │
│ ✅ This is what survives restart!       │
└──────────────┬──────────────────────────┘
               │

STEP 6: Return Success Response
┌──────────────────────────────┐
│ Response to Frontend         │
│                              │
│ Status: 201 Created          │
│ Body: {                      │
│   id: ObjectId,              │
│   title: "My Song",          │
│   artist: [...],             │
│   songUrl: "https://...",    │
│   coverUrl: "https://...",   │
│   moods: [...]               │
│ }                            │
└──────────────┬───────────────┘
               │

STEP 7: Frontend Updates UI
┌──────────────────────────────┐
│ Admin Panel / Song List      │
│                              │
│ ✅ "Upload successful!"      │
│ ✅ New song appears in list  │
│ ✅ Cover image displays      │
│ ✅ Can preview/play          │
└──────────────────────────────┘


WHAT HAPPENS ON RENDER RESTART:
═════════════════════════════════

Before Restart:
├─ Cloudinary has: Song file ✅
├─ MongoDB has: Song metadata + Cloudinary URL ✅
└─ Render disk has: Song data ✅

Restart Happens:
├─ Render disk wiped ❌
├─ Cloudinary files: Still there ✅
└─ MongoDB: Still there ✅

After Restart:
├─ GET /api/songs called
├─ Backend queries MongoDB
├─ MongoDB returns: { songUrl: "https://res.cloudinary.com/...", ... }
├─ Frontend displays song with Cloudinary URL
└─ Everything works! ✅

KEY INSIGHT:
═════════════
The Cloudinary URL is saved in MongoDB (cloud).
When Render restarts, the URL is retrieved from MongoDB.
The app uses the URL to stream from Cloudinary.
RESULT: No data loss! ✅
```

---

## 5. Data Persistence Matrix

```
┌────────────────────────────────────────────────────────────────────┐
│          WHAT SURVIVES RENDER RESTART (Persistent ✅)             │
└────────────────────────────────────────────────────────────────────┘

Service          │ Location        │ Survives Restart │ Why
─────────────────┼─────────────────┼──────────────────┼──────────────
Cloudinary       │ AWS/CDN         │ ✅ YES           │ External service
Cloudinary URLs  │ AWS/CDN         │ ✅ YES           │ Permanent links
─────────────────┼─────────────────┼──────────────────┼──────────────
MongoDB          │ AWS/Google/Azure│ ✅ YES           │ Cloud database
Users (MongoDB)  │ MongoDB Atlas   │ ✅ YES           │ Persistent DB
Songs (MongoDB)  │ MongoDB Atlas   │ ✅ YES           │ Persistent DB
Playlists        │ MongoDB Atlas   │ ✅ YES           │ Persistent DB
─────────────────┼─────────────────┼──────────────────┼──────────────
SQLite (old)     │ Render disk     │ ❌ NO (deleted)  │ Ephemeral
Local files      │ Render disk     │ ❌ NO (deleted)  │ Ephemeral
Node.js cache    │ Render disk     │ ❌ NO (cleared)  │ Ephemeral
─────────────────┼─────────────────┼──────────────────┼──────────────

CONCLUSION:
All persistent data is in cloud services (Cloudinary, MongoDB).
Render disk is only for temporary runtime files.
Server restart does NOT affect persistent data ✅
```

---

## 6. Request Flow After Deployment

```
┌─────────────────────────────────────────────────────────────────────┐
│                REQUEST LIFECYCLE (Complete)                         │
└─────────────────────────────────────────────────────────────────────┘

CLIENT REQUEST:
─────────────────
User: "Give me all songs"
     ↓
Frontend: fetch('/api/songs', {
  headers: {
    'Authorization': 'Bearer eyJhbGc...'
  }
})
     ↓

NETWORK:
────────
Internet
     ↓

RENDER SERVER (Node.js):
────────────────────────
1. Express receives request ✅
2. Middleware verifies JWT token
3. Extracts userId from token
4. Calls getSongs() controller
     ↓

MONGODB QUERY:
──────────────
Song.find({})
     ↓

MONGODB ATLAS (Cloud):
──────────────────────
MongoDB query executes
Returns all songs:
[
  {
    _id: ObjectId(...),
    title: "Song 1",
    artist: ["Artist"],
    songUrl: "https://res.cloudinary.com/...",  ← URL from Cloudinary
    coverUrl: "https://res.cloudinary.com/...",
    moods: ["happy"],
    createdAt: Date(...)
  },
  ...
]
     ↓

BACK TO SERVER:
───────────────
Express formats response
Sets headers
     ↓

RESPONSE TO CLIENT:
───────────────────
Status: 200 OK
Body: [
  {
    id: "...",
    title: "Song 1",
    artist: ["Artist"],
    songUrl: "https://res.cloudinary.com/...",  ← URL for frontend to use
    coverUrl: "https://res.cloudinary.com/...",
    moods: ["happy"]
  }
]
     ↓

FRONTEND:
─────────
React receives response
Maps data to components
Renders UI with:
├─ Song title
├─ Artist name
├─ Cover image (using coverUrl)
└─ Play button (links to songUrl)
     ↓

DISPLAY TO USER:
────────────────
User sees song in app ✅
Can click play
Can view cover
Everything works ✅
```

---

## 7. System Components & Dependencies

```
┌────────────────────────────────────────────────────────────────────┐
│                    COMPONENT ARCHITECTURE                          │
└────────────────────────────────────────────────────────────────────┘

Frontend Layer:
┌──────────────────────────────────────────────────────────────────┐
│ React / Ionic (Client)                                           │
│                                                                  │
│ Components:                                                      │
│ ├─ Admin Panel (upload songs)                                   │
│ ├─ Song List (display all songs)                                │
│ ├─ Search (find songs)                                          │
│ ├─ Playlist Manager (create/edit playlists)                     │
│ └─ Player (play songs using Cloudinary URLs)                   │
└──────────────────────┬───────────────────────────────────────────┘
                       │
API Layer:
┌──────────────────────▼───────────────────────────────────────────┐
│ Express.js (Node.js Backend)                                     │
│                                                                  │
│ Routes:                                                          │
│ ├─ /api/auth/register (save user to MongoDB)                   │
│ ├─ /api/auth/login (verify user from MongoDB)                  │
│ ├─ /api/songs/upload (save to Cloudinary + MongoDB)            │
│ ├─ /api/songs (retrieve from MongoDB)                          │
│ ├─ /api/playlists (CRUD operations with MongoDB)               │
│ └─ [middleware] JWT verification                               │
└──────────────────────┬───────────────────────────────────────────┘
                       │
Data Layer:
┌──────────────────────▼───────────────────────────────────────────┐
│ Mongoose (MongoDB ODM)                                           │
│                                                                  │
│ Models:                                                          │
│ ├─ User (name, email, password, isAdmin)                       │
│ ├─ Song (title, artist[], songUrl, coverUrl, moods)            │
│ ├─ Playlist (name, userId, songs[])                            │
│ └─ Connections to external services:                           │
│    ├─ Cloudinary (file storage)                                │
│    └─ JWT (authentication)                                     │
└──────────────────────┬───────────────────────────────────────────┘
                       │
Cloud Services:
┌──────────────────────▼───────────────────────────────────────────┐
│ ┌─────────────────────┐    ┌─────────────────────────────┐       │
│ │ MongoDB Atlas       │    │ Cloudinary                  │       │
│ │ (Cloud Database)    │    │ (File Storage CDN)          │       │
│ │                     │    │                             │       │
│ │ Stores:             │    │ Stores:                     │       │
│ │ • Users             │    │ • Song MP3 files            │       │
│ │ • Songs (with URLs) │    │ • Cover images              │       │
│ │ • Playlists         │    │                             │       │
│ │ • Relationships     │    │ Returns:                    │       │
│ │                     │    │ • HTTPS URLs                │       │
│ │ Accessed via:       │    │ • Cloudinary API            │       │
│ │ • Mongoose ODM      │    │                             │       │
│ │ • MongoDB driver    │    │ URLs saved in MongoDB ✅    │       │
│ └─────────────────────┘    └─────────────────────────────┘       │
└────────────────────────────────────────────────────────────────────┘
```

---

## 8. Security Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                           │
└────────────────────────────────────────────────────────────────────┘

User Logs In:
┌─────────────────────────────────────────────────────────────┐
│ 1. Send email + password to POST /api/auth/login          │
│    (Frontend sends via HTTPS ✅)                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 2. Backend queries MongoDB for user by email               │
│    (Mongoose connection uses password auth ✅)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 3. Backend compares password using bcryptjs                │
│    (Password never stored in plain text ✅)                 │
│    (Uses salting + hashing ✅)                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 4. If match, generate JWT token                            │
│    jwt.sign({ id: user._id }, JWT_SECRET, 7day expiry)    │
│    (Token signed with secret ✅)                            │
│    (Expires in 7 days ✅)                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 5. Send token to Frontend                                  │
│    (Sent via HTTPS ✅)                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
Protected Requests:
┌─────────────────────▼───────────────────────────────────────┐
│ 6. User makes request (e.g., upload song)                 │
│    Frontend includes token in Authorization header         │
│    POST /api/songs/upload {                                │
│      headers: {                                            │
│        'Authorization': 'Bearer eyJhbGc...'                │
│      }                                                     │
│    }                                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 7. Middleware verifies JWT                                 │
│    ├─ Extracts token from Authorization header             │
│    ├─ Verifies signature using JWT_SECRET                  │
│    ├─ Checks if expired                                    │
│    └─ If valid, adds user to request object                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 8. Controller function executes                            │
│    Can access req.user.id (from JWT)                       │
│    Perform action (upload song)                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 9. Save to MongoDB with userId reference                   │
│    Ensures user can only access own data                   │
└────────────────────────────────────────────────────────────┘

SECURITY FEATURES:
══════════════════
✅ Passwords hashed with bcryptjs (salted)
✅ JWT tokens signed with secret key
✅ JWT tokens expire after 7 days
✅ HTTPS encryption (Render + Cloudinary + MongoDB)
✅ MongoDB credentials in .env (not in code)
✅ API keys for Cloudinary in .env (not in code)
✅ Protected routes require valid JWT
✅ User data isolated by userId
```

---

## 9. Monitoring & Logging

```
┌────────────────────────────────────────────────────────────────────┐
│              MONITORING & DEBUGGING POINTS                         │
└────────────────────────────────────────────────────────────────────┘

Server Startup:
───────────────
console.log('Server running on http://localhost:5000')
console.log('MongoDB Atlas Connected: cluster0.mongodb.net')


User Registration:
──────────────────
✅ User created in MongoDB
console.log('User registered:', email)

Upload Song:
────────────
✅ File uploaded to Cloudinary
console.log('Uploaded to Cloudinary:', songUrl)

✅ Metadata saved to MongoDB
console.log('Song saved to MongoDB:', songDoc._id)

Retrieve Songs:
───────────────
✅ Query MongoDB
console.log('Retrieved songs count:', docs.length)

✅ Return with Cloudinary URLs
console.log('Song URLs:', songUrl, coverUrl)


ERROR SCENARIOS:
────────────────

MongoDB Connection Failed:
  console.error('Error connecting to MongoDB:', err)
  App continues (helpful for debugging)

Song Upload Failed:
  console.error('Upload Error:', err)
  Returns 500 status to client
  
MongoDB Query Failed:
  console.error('MongoDB fetch error:', err)
  Returns 500 status to client


RENDER LOGS INDICATORS:
──────────────────────

✅ Good (means everything works):
   "MongoDB Atlas Connected: cluster0.mongodb.net"
   "Server is running on http://localhost:5000"
   "User registered: test@example.com"

❌ Bad (means something wrong):
   "MONGO_URI not set; skipping MongoDB"
   "Error connecting to MongoDB"
   "Cannot find module 'mongoose'"
```

---

## Summary Diagram

```
                           ┌─────────────────────────────────┐
                           │     Your Mellow Music App       │
                           └────────────────┬────────────────┘
                                            │
                       ┌────────────────────┼────────────────────┐
                       │                    │                    │
                  ┌────▼────┐         ┌─────▼──────┐       ┌────▼─────┐
                  │Frontend  │         │  Backend   │       │JWT Token │
                  │(Mobile)  │         │(Express)   │       │(Auth)    │
                  └──────────┘         └──────┬─────┘       └──────────┘
                       ▲                      │
                       │              ┌───────▼─────────┐
                       │              │ Mongoose Models │
                       │              │                 │
                       │              ├─ User          │
                       │              ├─ Song          │
                       │              ├─ Playlist      │
                       │              └────┬────┬──────┘
                       │                   │    │
          ┌────────────┘               ┌───▼┐ ┌▼────┐
          │                            │    │ │     │
     ┌────▼─────────────────────────┐ │    │ │     │
     │                              │ │    │ │     │
     │   ┌──────────────────────┐   │ │    │ │     │
     │   │  CLOUDINARY          │   │ │    │ │     │
     │   │  ┌──────────────┐    │   │ │    │ │     │
     │   │  │ Song Files   │    │   │ │    │ │     │
     │   │  │ Cover Images │    │   │ │    │ │     │
     │   │  │ Returns URLs │    │   │ │    │ │     │
     │   │  └──────────────┘    │   │ │    │ │     │
     │   │  (Permanent) ✅      │   │ │    │ │     │
     │   └──────────────────────┘   │ │    │ │     │
     │                              │ │    │ │     │
     │   ┌──────────────────────┐   │ │    │ │     │
     │   │  MONGODB ATLAS       │───┘─┘    │ │     │
     │   │  ┌──────────────┐    │          │ │     │
     │   │  │ Users        │    │          │ │     │
     │   │  │ Songs + URLs ✅   │◄─────────┘ │     │
     │   │  │ Playlists    │    │            │     │
     │   │  │ Metadata     │    │            │     │
     │   │  └──────────────┘    │            │     │
     │   │  (Persistent) ✅     │            │     │
     │   └──────────────────────┘            │     │
     │                                       │     │
     │   Cloudinary URLs in MongoDB ✅       │     │
     │   = Songs persist after Render       │     │
     │     restart ✅                        │     │
     └────────────────────────────────────────┘     │
         │                                           │
         └───────────────────────────────────────────┘

RENDER RESTART SCENARIO:
═══════════════════════

Before: Render disk ✅ + Cloudinary ✅ + MongoDB ✅
Restart: Render disk ❌ + Cloudinary ✅ + MongoDB ✅
After: Render disk (new) + Cloudinary ✅ + MongoDB ✅
Result: EVERYTHING WORKS ✅
```

---

**All diagrams updated: November 27, 2025** ✅
