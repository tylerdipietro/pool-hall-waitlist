// backend/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

// Local imports
const socketIO = require('./sockets/io');
const socketHandler = require('./sockets/socketHandler');
const authRoutes = require('./routes/authRoutes');
const queueRoutes = require('./routes/queueRoutes');
const tableRoutes = require('./routes/tableRoutes');
const Table = require('./models/Table');
require('./utils/passportSetup');

// --- Constants ---
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/poolhall';
const CLIENT_ORIGIN = process.env.CLIENT_HOME_PAGE_URL || 'http://localhost:19000';

// --- Middleware ---
const allowedOrigins = [
  'https://tylerdipietro.github.io',  // Your GitHub Pages domain
  'http://localhost:3000',            // Local dev
  'https://pool-hall-waitlist-3b8c64cbf25d.herokuapp.com' // Optional: backend itself
];

app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin like mobile apps or curl requests
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI, collectionName: 'sessions' }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/table', tableRoutes);

// --- MongoDB Connection ---
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
  initializeTables();
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// --- Initialize Tables (if empty) ---
async function initializeTables() {
  try {
    const count = await Table.countDocuments();
    if (count === 0) {
      const tables = [1, 2, 3].map(num => ({
        tableNumber: num,
        players: [],
      }));
      await Table.insertMany(tables);
      console.log('Initialized 3 empty tables');
    } else {
      console.log(`Found ${count} tables already initialized`);
    }
  } catch (err) {
    console.error('Error initializing tables:', err);
  }
}

// --- Create HTTP & Socket.io Server ---
const server = http.createServer(app);
const io = socketIO.init(server); // calls and returns io instance
socketHandler(io); // wire up events

// --- Start Server ---
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
