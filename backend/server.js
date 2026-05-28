require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const pool = require('./db/pool');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());

// Dynamic CORS for deployment readiness
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /^https:\/\/team-task-manager.*\.vercel\.app$/,  // This allows ANY Vercel preview URL
'https://task-manager-gylh6uzui-muhammad-bilal-s-projects5.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like curl)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// Session configuration
const PgSession = require('connect-pg-simple')(session);
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: 'lax'
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return done(null, null);
    }
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

// Updated Passport strategy with generic error messages (prevents account enumeration)
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      
      // Generic error - don't reveal if user exists
      if (result.rows.length === 0) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      
      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);
      
      // Generic error - don't reveal if password is wrong
      if (!isValid) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      
      return done(null, { id: user.id, email: user.email });
    } catch (err) {
      console.error('Passport strategy error:', err);
      return done(err);
    }
  }
));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/teams', require('./routes/teams'));
app.use('/tasks', require('./routes/tasks'));

// Test route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', user: req.user || null });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});