const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./utils/firebaseClient');

const JWT_SECRET = process.env.JWT_SECRET || 'cert_mgmt_jwt_secret_2024';
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || 'create_admin_123';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.url.split('/api/auth/')[1]?.split('?')[0];

  // POST /api/auth/login
  if (action === 'login' && req.method === 'POST') {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { message: 'Email and password required' } });
    }
    
    try {
      const querySnapshot = await db.collection('users').where('email', '==', email.toLowerCase()).get();

      if (querySnapshot.empty) {
        return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
      }

      const userDoc = querySnapshot.docs[0];
      const user = { id: userDoc.id, ...userDoc.data() };

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        data: {
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role }
        }
      });
    } catch (e) {
      console.error('Firebase Admin Auth Login Error:', e);
      return res.status(500).json({ success: false, error: { message: 'Server error', details: e.message } });
    }
  }

  // POST /api/auth/signup
  if (action === 'signup' && req.method === 'POST') {
    const { name, email, password, adminCode } = req.body;
    if (adminCode !== ADMIN_SECRET_CODE) {
      return res.status(403).json({ success: false, error: { message: 'Invalid admin code' } });
    }
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: { message: 'All fields required' } });
    }
    
    try {
      const querySnapshot = await db.collection('users').where('email', '==', email.toLowerCase()).get();

      if (!querySnapshot.empty) {
        return res.status(400).json({ success: false, error: { message: 'User already exists' } });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const docRef = await db.collection('users').add({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date().toISOString()
      });

      const token = jwt.sign(
        { id: docRef.id, name, email: email.toLowerCase(), role: 'admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        data: {
          token,
          user: { id: docRef.id, name, email: email.toLowerCase(), role: 'admin' }
        }
      });
    } catch (e) {
      console.error('Firebase Admin Auth Signup Error:', e);
      return res.status(500).json({ success: false, error: { message: 'Server error', details: e.message } });
    }
  }

  // GET /api/auth/me
  if (action === 'me' && req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      }
      const user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      return res.status(200).json({ success: true, data: { user } });
    } catch (e) {
      return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
    }
  }

  return res.status(404).json({ success: false, error: { message: 'Not found' } });
};
