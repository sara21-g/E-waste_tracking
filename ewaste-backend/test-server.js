const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ success: true, message: '♻️ EWaste Platform API is running!' });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// ── Stub Routes (return mock data, no DB needed) ──────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email required' });
  res.status(201).json({
    success: true,
    message: 'Registration successful (test mode — no data saved)',
    data: { user: { id: 'test-id-123', name, email, role: role || 'household', carbonPoints: 0 } }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  res.json({
    success: true,
    message: 'Login successful (test mode)',
    data: { accessToken: 'test-token-abc123', user: { id: 'test-id-123', email, role: 'household' } }
  });
});

app.get('/api/waste', (req, res) => {
  res.json({
    success: true,
    data: [
      { _id: '1', name: 'Laptop', category: 'it_equipment', pointsPerKg: 15, carbonEmissionFactor: 4.2 },
      { _id: '2', name: 'Mobile Phone', category: 'it_equipment', pointsPerKg: 20, carbonEmissionFactor: 3.5 },
      { _id: '3', name: 'Television', category: 'screens', pointsPerKg: 10, carbonEmissionFactor: 2.8 },
      { _id: '4', name: 'Refrigerator', category: 'large_appliances', pointsPerKg: 8, carbonEmissionFactor: 2.5 },
      { _id: '5', name: 'Battery', category: 'batteries', pointsPerKg: 25, carbonEmissionFactor: 6.0 },
    ]
  });
});

app.post('/api/pickups', (req, res) => {
  const { items, scheduledDate, pickupAddress } = req.body;
  if (!items || !scheduledDate || !pickupAddress) {
    return res.status(400).json({ success: false, message: 'items, scheduledDate and pickupAddress are required' });
  }
  res.status(201).json({
    success: true,
    message: 'Pickup scheduled (test mode — no data saved)',
    data: {
      pickupId: 'PKP-TEST1234',
      status: 'pending',
      scheduledDate,
      items,
      pickupAddress,
      estimatedPoints: items.length * 50
    }
  });
});

app.get('/api/carbon/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      currentBalance: 350,
      totalEarned: 400,
      totalRedeemed: 50,
      totalCarbonReduced: 18.5,
      treesEquivalent: '0.88',
      kmsNotDriven: 88,
      level: { name: 'Green Warrior', badge: '♻️', tier: 2 }
    }
  });
});

app.get('/api/carbon/leaderboard', (req, res) => {
  res.json({
    success: true,
    data: [
      { rank: 1, name: 'Priya S.', totalPoints: 1240, totalCarbon: 52.3 },
      { rank: 2, name: 'Rahul M.', totalPoints: 980, totalCarbon: 41.0 },
      { rank: 3, name: 'Anita K.', totalPoints: 750, totalCarbon: 32.1 },
    ]
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅ EWaste Platform test server running at http://localhost:${PORT}`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   GET  http://localhost:${PORT}/api/waste`);
  console.log(`   POST http://localhost:${PORT}/api/pickups`);
  console.log(`   GET  http://localhost:${PORT}/api/carbon/summary`);
  console.log(`   GET  http://localhost:${PORT}/api/carbon/leaderboard\n`);
});
