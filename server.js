require('dotenv').config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const contactsRouter = require('./routes/contacts');
const authRouter = require('./routes/auth');
const userModel = require('./models/user');
const configurePassport = require('./config/passport');

const app = express();

// ========================
// MULTER CONFIGURATION FOR FILE UPLOADS
// ========================
const uploadsDir = path.join(__dirname, 'public/uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: contact_{id}_{timestamp}.{ext}
        const contactId = req.params.id || 'new';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `contact_${contactId}_${uniqueSuffix}${ext}`);
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Make upload middleware available to routes
app.set('upload', upload);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  index: false
}));

// ========================
// EXPRESS-SESSION CONFIGURATION
// ========================
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
});

app.use(sessionMiddleware);

// ========================
// PASSPORT CONFIG
// ========================
app.use(passport.initialize());
app.use(passport.session());

configurePassport(passport);

// Make session/user available
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.user = req.user || null;
  next();
});

// ========================
// DATABASE
// ========================
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "1002",
  database: process.env.DB_NAME || "contactbook",
  port: parseInt(process.env.DB_PORT) || 3307
});

db.connect(err => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

userModel.init(db);
contactsRouter.setDb(db);

// ========================
// ROUTES
// ========================
app.use('/auth', authRouter);
app.use('/contacts', contactsRouter);

// ========================
// ROOT ROUTE
// ========================
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.sendFile(path.join(__dirname, 'public/index.html'));
  }
  return res.redirect('/login');
});

// ========================
// LOGIN PAGE
// ========================
app.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ========================
// REGISTER PAGE
// ========================
app.get('/register', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// ========================
// ERROR HANDLER
// ========================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ========================
// SERVER START
// ========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});