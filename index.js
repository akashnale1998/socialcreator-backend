const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./utils/db');
const aiRoutes = require('./routes/ai');
const Passport = require('passport');
const configurePassport = require('./config/passport');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

// Passport Config
configurePassport();

const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();

// Security Headers
app.use(helmet());

// Response Compression
app.use(compression());

// Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(Passport.initialize());

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/', (req, res) => {
  res.send('SocialCreator AI API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
