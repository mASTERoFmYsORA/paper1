require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const User = require('./models/User');

const app = express();
const PORT = 8000;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// EJS view engine
app.set('view engine', 'ejs');

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'defaultSecret',
    resave: false,
    saveUninitialized: true,
  })
);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Store for logged-in users
const loggedInUsers = [];

// Routes
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Registration Page
app.get('/register', (req, res) => {
  res.render('register');
});

// Register Route
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).send('Username already taken');
  }

  const user = new User({ userId: uuidv4(), username, password });
  await user.save();
  res.redirect('/login');
});

// Login Page
app.get('/login', (req, res) => {
  res.render('login');
});

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });

  if (user) {
    req.session.userId = user.userId;
    // Store logged-in user
    if (!loggedInUsers.includes(user.username)) {
      loggedInUsers.push(user.username);
    }
    res.redirect('/profile');
  } else {
    res.status(401).send('Invalid username or password');
  }
});
// Profile Page
app.get('/profile', async (req, res) => {
    const { userId } = req.session;
  
    if (!userId) {
      return res.redirect('/login');
    }
  
    const user = await User.findOne({ userId }, { password: 0 });
    if (!user) {
      return res.status(404).send('User not found');
    }
  
    // Pass loggedInUsers to the profile view
    res.render('profile', { user, loggedInUsers });
  });
  
// Route to display all logged-in users
app.get('/active-users', (req, res) => {
  res.render('active-users', { loggedInUsers });
});

// Logout Route
app.post('/logout', async (req, res) => {
  const { userId } = req.session;

  if (userId) {
    const user = await User.findOne({ userId });
    if (user) {
      // Remove from logged-in users
      const index = loggedInUsers.indexOf(user.username);
      if (index !== -1) {
        loggedInUsers.splice(index, 1);
      }
      await User.deleteOne({ userId });
    }

    req.session.destroy((err) => {
      if (err) return res.status(500).send('Could not log out');
      res.redirect('/login');
    });
  } else {
    res.status(400).send('No user is logged in');
  }
});

// Start the server
app.listen(8000, () => {
  console.log(`Server running on http://localhost:${8000}`);
});
