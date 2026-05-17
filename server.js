const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const axios = require('axios');

dotenv.config({ path: '.env.local' });

const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

// Log SMTP configuration (masked password)
const maskPassword = (pass) => pass ? pass.substring(0, 4) + '****' : 'not set';
console.log('[v0] SMTP Configuration:');
console.log(`  - Host: ${process.env.SMTP_HOST || 'not set'}`);
console.log(`  - Port: ${process.env.SMTP_PORT || 'not set'}`);
console.log(`  - User: ${process.env.SMTP_USER || 'not set'}`);
console.log(`  - Pass: ${maskPassword(process.env.SMTP_PASS)}`);
console.log(`  - Secure: ${process.env.SMTP_SECURE === 'true'}`);


const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory
if (!fs.existsSync('./public/uploads')) {
  fs.mkdirSync('./public/uploads', { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Log startup
console.log('[v0] Server starting...');
console.log('[v0] Database Host:', process.env.DB_HOST);
console.log('[v0] Database Name:', process.env.DB_NAME);

// Database pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '411231174_haryokusumow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('[v0] ✓ Database connection successful!');
    connection.release();
  })
  .catch(error => {
    console.error('[v0] ✗ Database connection failed:', error.message);
    console.error('[v0] Make sure MySQL is running and credentials are correct');
  });

// JWT Secrets
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key';

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/db-health', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [result] = await conn.query('SELECT 1 as test');
    conn.release();
    res.json({ 
      status: 'connected', 
      database: process.env.DB_NAME,
      message: 'Database connection successful'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// ==================== AUTHENTICATION ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      confirmPassword,
      fullName,
      role,
      recaptchaToken
    } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        message: 'All fields are required'
      });
    }

    // Password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: 'Passwords do not match'
      });
    }

    // reCAPTCHA temporarily disabled
    console.log('[v0] Register CAPTCHA bypassed');

    // Database connection
    const conn = await pool.getConnection();

    // Check existing user
    const [existingUser] = await conn.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser.length > 0) {
      conn.release();

      return res.status(400).json({
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await conn.query(
      `
      INSERT INTO users (
        username,
        email,
        password,
        role,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        username,
        email,
        hashedPassword,
        role || 'Employee',
        'Active'
      ]
    );

    conn.release();

    // User payload
    const user = {
      id: result.insertId,
      username,
      email,
      role: role || 'Employee',
    };

    // Generate tokens
    const accessToken = jwt.sign(
      user,
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      user,
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Response
    res.status(201).json({
      message: 'User registered successfully',
      user,
      accessToken,
      refreshToken,
    });

  } catch (error) {
    console.error('[v0] Register error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe, recaptchaToken } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // reCAPTCHA temporarily disabled
    console.log('[v0] Login CAPTCHA bypassed');

    // Database connection
    const conn = await pool.getConnection();

    // Find user
    const [users] = await conn.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      conn.release();
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      conn.release();
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (user.status !== 'Active') {
      conn.release();
      return res.status(401).json({
        message: 'Account is not active'
      });
    }

    // Update last login
    await conn.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    conn.release();

    // User payload
    const userPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    // Generate tokens
    const accessToken = jwt.sign(
      userPayload,
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      userPayload,
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Response
    res.json({
      message: 'Login successful',
      user: userPayload,
      accessToken,
      refreshToken,
    });

  } catch (error) {
    console.error('[v0] Login error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Forgot password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const conn = await pool.getConnection();
    const [users] = await conn.query('SELECT id, email, status FROM users WHERE email = ?', [email]);
    conn.release();

    if (users.length === 0) {
      return res.status(404).json({ message: 'Email not registered' });
    }

    const user = users[0];
    if (user.status !== 'Active') {
      return res.status(400).json({ message: 'Account is not active' });
    }

    const resetToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const fromAddress = process.env.MAIL_FROM || 'no-reply@hr-system.com';

    const mailOptions = {
      from: fromAddress,
      to: user.email,
      subject: 'Reset Password',
      html: `
        <h2>Reset Password</h2>
        <a href="${resetLink}">Klik untuk reset password</a>
      `,
    };

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[v0] SMTP is not configured. Reset email not sent.');
      console.log(`[v0] Password reset requested for ${email}. Reset link: ${resetLink}`);
      return res.status(200).json({ message: 'Password reset instructions have been generated. SMTP is not configured, so email was not sent.' });
    }

    await emailTransporter.sendMail(mailOptions);
    console.log(`[v0] Password reset email sent to ${email}`);

    res.json({ message: 'Password reset instructions have been sent to your email.' });
  } catch (error) {
    console.error('[v0] Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process password reset', error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const { id, email } = decoded;
      const conn = await pool.getConnection();
      const [users] = await conn.query('SELECT id, email, status FROM users WHERE id = ? AND email = ?', [id, email]);

      if (users.length === 0) {
        conn.release();
        return res.status(404).json({ message: 'User not found' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await conn.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
      conn.release();

      res.json({ message: 'Password has been reset successfully' });
    });
  } catch (error) {
    console.error('[v0] Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Refresh token
app.post('/api/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    jwt.verify(refreshToken, REFRESH_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }
      const newAccessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
      res.json({ accessToken: newAccessToken });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== EMPLOYEES ====================

// Get all employees
app.get('/api/employees', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', division = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    const conn = await pool.getConnection();

    let query = 'SELECT * FROM employees WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM employees WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (full_name LIKE ? OR email LIKE ? OR employee_code LIKE ?)';
      countQuery += ' AND (full_name LIKE ? OR email LIKE ? OR employee_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (division) {
      query += ' AND division = ?';
      countQuery += ' AND division = ?';
      params.push(division);
    }

    if (status) {
      query += ' AND employment_status = ?';
      countQuery += ' AND employment_status = ?';
      params.push(status);
    }

    query += ' ORDER BY employee_code ASC LIMIT ? OFFSET ?';

    const [employees] = await conn.query(query, [...params, parseInt(limit), offset]);
    const [countResult] = await conn.query(countQuery, params);

    conn.release();

    res.json({
      data: employees,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(countResult[0].total / limit),
    });
  } catch (error) {
    console.error('[v0] Get employees error:', error.message);
    res.status(500).json({ message: 'Failed to fetch employees', error: error.message });
  }
});

// Get single employee
app.get('/api/employees/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await pool.getConnection();

    const [employees] = await conn.query('SELECT * FROM employees WHERE id = ?', [id]);
    conn.release();

    if (employees.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employees[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employee', error: error.message });
  }
});

// Create employee
app.post('/api/employees', verifyToken, upload.single('profile_photo'), async (req, res) => {
  try {
    const {
      employee_code, full_name, gender, birth_date, email, phone_number,
      address, city, province, postal_code, division, position, salary,
      join_date, employment_status, emergency_contact, emergency_phone,
      education, marital_status
    } = req.body;

    if (!employee_code || !full_name || !email || !division) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const conn = await pool.getConnection();

    // Check if email exists
    const [existing] = await conn.query('SELECT id FROM employees WHERE email = ?', [email]);
    if (existing.length > 0) {
      conn.release();
      return res.status(400).json({ message: 'Email already exists' });
    }

    const profilePhoto = req.file ? req.file.filename : null;

    const [result] = await conn.query(
      `INSERT INTO employees (
        employee_code, full_name, gender, birth_date, email, phone_number,
        address, city, province, postal_code, division, position, salary,
        join_date, employment_status, profile_photo, emergency_contact, emergency_phone,
        education, marital_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        employee_code, full_name, gender, birth_date, email, phone_number,
        address, city, province, postal_code, division, position, salary,
        join_date, employment_status, profilePhoto, emergency_contact, emergency_phone,
        education, marital_status
      ]
    );

    conn.release();

    res.status(201).json({
      message: 'Employee created successfully',
      id: result.insertId,
    });
  } catch (error) {
    console.error('[v0] Create employee error:', error.message);
    res.status(500).json({ message: 'Failed to create employee', error: error.message });
  }
});

// Update employee
app.put('/api/employees/:id', verifyToken, upload.single('profile_photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employee_code, full_name, gender, birth_date, email, phone_number,
      address, city, province, postal_code, division, position, salary,
      join_date, employment_status, emergency_contact, emergency_phone,
      education, marital_status
    } = req.body;

    const conn = await pool.getConnection();

    // Check if employee exists
    const [existing] = await conn.query('SELECT profile_photo FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Employee not found' });
    }

    let profilePhoto = existing[0].profile_photo;
    if (req.file) {
      profilePhoto = req.file.filename;
    }

    await conn.query(
      `UPDATE employees SET
        employee_code = ?, full_name = ?, gender = ?, birth_date = ?, email = ?, phone_number = ?,
        address = ?, city = ?, province = ?, postal_code = ?, division = ?, position = ?, salary = ?,
        join_date = ?, employment_status = ?, profile_photo = ?, emergency_contact = ?, emergency_phone = ?,
        education = ?, marital_status = ?, updated_at = NOW()
      WHERE id = ?`,
      [
        employee_code, full_name, gender, birth_date, email, phone_number,
        address, city, province, postal_code, division, position, salary,
        join_date, employment_status, profilePhoto, emergency_contact, emergency_phone,
        education, marital_status, id
      ]
    );

    conn.release();

    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('[v0] Update employee error:', error.message);
    res.status(500).json({ message: 'Failed to update employee', error: error.message });
  }
});

// Delete employee
app.delete('/api/employees/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await pool.getConnection();

    const [result] = await conn.query('DELETE FROM employees WHERE id = ?', [id]);
    conn.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('[v0] Delete employee error:', error.message);
    res.status(500).json({ message: 'Failed to delete employee', error: error.message });
  }
});

// ==================== USERS ====================

// Get all users
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;

    const conn = await pool.getConnection();

    let query = 'SELECT id, username, email, role, status, last_login, created_at FROM users WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (username LIKE ? OR email LIKE ?)';
      countQuery += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      query += ' AND role = ?';
      countQuery += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const [users] = await conn.query(query, [...params, parseInt(limit), offset]);
    const [countResult] = await conn.query(countQuery, params);

    conn.release();

    res.json({
      data: users,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(countResult[0].total / limit),
    });
  } catch (error) {
    console.error('[v0] Get users error:', error.message);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Update user
app.put('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    const conn = await pool.getConnection();

    await conn.query(
      'UPDATE users SET role = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [role, status, id]
    );

    conn.release();

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('[v0] Update user error:', error.message);
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await pool.getConnection();

    const [result] = await conn.query('DELETE FROM users WHERE id = ?', [id]);
    conn.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[v0] Delete user error:', error.message);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

// ==================== DASHBOARD ====================

// Dashboard stats
app.get('/api/dashboard/stats', verifyToken, async (req, res) => {
  try {
    const conn = await pool.getConnection();

    const [empCount] = await conn.query('SELECT COUNT(*) as count FROM employees WHERE employment_status = "Active"');
    const [userCount] = await conn.query('SELECT COUNT(*) as count FROM users WHERE status = "Active"');
    const [divCount] = await conn.query('SELECT COUNT(DISTINCT division) as count FROM employees');
    const [totalEmp] = await conn.query('SELECT COUNT(*) as count FROM employees');

    conn.release();

    res.json({
      activeEmployees: empCount[0].count,
      totalUsers: userCount[0].count,
      totalDivisions: divCount[0].count,
      divisions: divCount[0].count,
      totalEmployees: totalEmp[0].count,
    });
  } catch (error) {
    console.error('[v0] Dashboard stats error:', error.message);
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

// Employee growth (last 12 months)
app.get('/api/dashboard/growth', verifyToken, async (req, res) => {
  try {
    const conn = await pool.getConnection();

    const [data] = await conn.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count
      FROM employees
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    conn.release();

    res.json(data);
  } catch (error) {
    console.error('[v0] Growth data error:', error.message);
    res.status(500).json({ message: 'Failed to fetch growth data', error: error.message });
  }
});

// Division distribution
app.get('/api/dashboard/divisions', verifyToken, async (req, res) => {
  try {
    const conn = await pool.getConnection();

    const [data] = await conn.query(`
      SELECT 
        division,
        COUNT(*) as count
      FROM employees
      GROUP BY division
      ORDER BY count DESC
    `);

    conn.release();

    res.json(data);
  } catch (error) {
    console.error('[v0] Division data error:', error.message);
    res.status(500).json({ message: 'Failed to fetch division data', error: error.message });
  }
});

// Recent employees
app.get('/api/dashboard/recent', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const conn = await pool.getConnection();

    const [data] = await conn.query(`
      SELECT
        id,
        employee_code,
        full_name,
        division,
        position,
        employment_status,
        join_date
      FROM employees
      ORDER BY employee_code ASC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await conn.query('SELECT COUNT(*) as total FROM employees');
    const total = countResult[0].total || 0;

    conn.release();

    res.json({
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[v0] Recent employees error:', error.message);
    res.status(500).json({ message: 'Failed to fetch recent employees', error: error.message });
  }
});

// ==================== FILE OPERATIONS ====================

// Upload file
app.post('/api/upload/file', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileExt = path.extname(fileName).toLowerCase();
    
    console.log('[v0] ========== UPLOAD START ==========');
    console.log('[v0] File:', fileName);
    console.log('[v0] Extension:', fileExt);
    console.log('[v0] File path:', filePath);
    
    let data = [];

    // Use XLSX to read both Excel and CSV files (more robust)
    try {
      const workbook = XLSX.readFile(filePath, { 
        raw: false,
        defval: ''
      });
      
      console.log('[v0] File Type:', fileExt);
      console.log('[v0] Sheet names:', workbook.SheetNames);
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: ''
      });
      
      if (data.length > 0) {
        console.log('[v0] Headers detected:', Object.keys(data[0]));
        console.log('[v0] Total rows:', data.length);
        console.log('[v0] First row raw:', JSON.stringify(data[0]));
        
        // Log first 3 rows for debugging
        for (let i = 0; i < Math.min(3, data.length); i++) {
          console.log(`[v0] Row ${i + 1} content:`, JSON.stringify(data[i]));
        }
      }
    } catch (parseErr) {
      console.error('[v0] Parse error:', parseErr.message);
      throw parseErr;
    }
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: 'No data found in file' });
    }

    // Get database connection
    const conn = await pool.getConnection();
    let insertedCount = 0;
    let failedCount = 0;
    const errors = [];

    // Insert each employee
    for (let index = 0; index < data.length; index++) {
      try {
        const rawRow = data[index];
        console.log(`[v0] ===== Processing Row ${index + 1} =====`);
        console.log(`[v0] Raw row data:`, JSON.stringify(rawRow));

        // Normalize all keys to lowercase and remove spaces
        const emp = {};
        const originalKeys = {};
        Object.keys(rawRow).forEach(key => {
          const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
          emp[normalizedKey] = String(rawRow[key] || '').trim();
          originalKeys[normalizedKey] = key;
        });

        console.log(`[v0] Normalized keys:`, Object.keys(emp));
        console.log(`[v0] Normalized emp:`, JSON.stringify(emp));

        // Helper function to find value from multiple possible field names
        const findFieldValue = (fieldNames) => {
          for (const fieldName of fieldNames) {
            const normalized = fieldName.toLowerCase().replace(/\s+/g, '_');
            if (emp[normalized] && emp[normalized].length > 0) {
              return emp[normalized];
            }
          }
          return '';
        };

        // Extract employee code
        let empCode = findFieldValue(['employee_code', 'code', 'nip', 'employee code', 'no. pegawai', 'kode pegawai']);
        
        // If still empty, try to find any field that looks like employee code
        if (!empCode) {
          for (const key in emp) {
            const value = emp[key];
            if (value && (value.match(/^EMP\d+/) || value.match(/^[A-Z0-9]{4,}/))) {
              empCode = value;
              console.log(`[v0] Found employee code in field "${key}": ${empCode}`);
              break;
            }
          }
        }

        // Extract employee name
        let empName = findFieldValue(['full_name', 'name', 'nama', 'full name', 'nama lengkap', 'employee name']);

        console.log(`[v0] Extracted - Code: "${empCode}", Name: "${empName}"`);

        // Validation
        if (!empCode || empCode.length === 0) {
          failedCount++;
          const availableFields = Object.keys(emp).map(k => `${k}="${emp[k]}"`).join('; ');
          const errMsg = `Row ${index + 2}: Employee code not found. Available: ${availableFields}`;
          errors.push(errMsg);
          console.error(`[v0] ${errMsg}`);
          continue;
        }

        if (!empName || empName.length === 0) {
          failedCount++;
          const availableFields = Object.keys(emp).map(k => `${k}="${emp[k]}"`).join('; ');
          const errMsg = `Row ${index + 2}: Employee name not found. Available: ${availableFields}`;
          errors.push(errMsg);
          console.error(`[v0] ${errMsg}`);
          continue;
        }

        // Generate default email if not provided
        let empEmail = findFieldValue(['email', 'email address', 'e-mail']);
        
        // If email is empty, generate unique one
        if (!empEmail || empEmail.length === 0) {
          empEmail = `${empCode.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substr(2, 9)}@company.local`;
          console.log(`[v0] Generated email: ${empEmail}`);
        }

        console.log(`[v0] Final values - Code: "${empCode}", Name: "${empName}", Email: "${empEmail}"`);

        // Extract all other fields (optional)
        const empGender = findFieldValue(['gender']);
        const empBirthDate = findFieldValue(['birth_date', 'birth date', 'tanggal lahir']);
        const empPhoneNumber = findFieldValue(['phone_number', 'phone number', 'telepon']);
        const empAddress = findFieldValue(['address', 'alamat']);
        const empCity = findFieldValue(['city', 'kota']);
        const empProvince = findFieldValue(['province', 'provinsi']);
        const empPostalCode = findFieldValue(['postal_code', 'postal code', 'kode pos']);
        const empDivision = findFieldValue(['division', 'divisi']);
        const empPosition = findFieldValue(['position', 'posisi', 'jabatan']);
        const empSalary = findFieldValue(['salary', 'gaji']);
        const empJoinDate = findFieldValue(['join_date', 'join date', 'tanggal bergabung']);
        const empStatus = findFieldValue(['employment_status', 'employment status', 'status']) || 'Active';
        const empEmergencyContact = findFieldValue(['emergency_contact', 'emergency contact']);
        const empEmergencyPhone = findFieldValue(['emergency_phone', 'emergency phone']);
        const empEducation = findFieldValue(['education', 'pendidikan']);
        const empMaritalStatus = findFieldValue(['marital_status', 'marital status', 'status pernikahan']);

        console.log(`[v0] All extracted fields:`, {
          empCode, empName, empEmail, empGender, empBirthDate, empPhoneNumber,
          empAddress, empCity, empProvince, empPostalCode, empDivision, 
          empPosition, empSalary, empJoinDate, empStatus
        });

        // Check if employee already exists
        const [existingEmp] = await conn.query(
          'SELECT id, email FROM employees WHERE employee_code = ?',
          [empCode]
        );

        if (existingEmp && existingEmp.length > 0) {
          console.log(`[v0] Row ${index + 1}: UPDATING existing employee ${empCode}`);
          const existingEmail = existingEmp[0].email;
          
          // Only update email if it's different to avoid UNIQUE constraint
          const emailToUse = empEmail !== existingEmail ? empEmail : existingEmail;
          
          // Update existing employee with all fields
          await conn.query(
            `UPDATE employees SET 
              full_name = ?, gender = ?, birth_date = ?, email = ?, phone_number = ?,
              address = ?, city = ?, province = ?, postal_code = ?, division = ?,
              position = ?, salary = ?, join_date = ?, employment_status = ?,
              emergency_contact = ?, emergency_phone = ?, education = ?,
              marital_status = ?, updated_at = NOW()
            WHERE employee_code = ?`,
            [
              empName,
              empGender || null,
              empBirthDate || null,
              emailToUse,
              empPhoneNumber || null,
              empAddress || null,
              empCity || null,
              empProvince || null,
              empPostalCode || null,
              empDivision || null,
              empPosition || null,
              empSalary || null,
              empJoinDate || null,
              empStatus || 'Active',
              empEmergencyContact || null,
              empEmergencyPhone || null,
              empEducation || null,
              empMaritalStatus || null,
              empCode
            ]
          );
        } else {
          console.log(`[v0] Row ${index + 1}: INSERTING new employee ${empCode}`);
          
          // Check if email already exists to avoid UNIQUE constraint
          const [emailExists] = await conn.query(
            'SELECT id FROM employees WHERE email = ?',
            [empEmail]
          );
          
          if (emailExists && emailExists.length > 0) {
            console.log(`[v0] Email already exists, generating unique one`);
            empEmail = `${empCode.toLowerCase()}_${Math.random().toString(36).substr(2, 9)}@company.local`;
          }
          
          // Insert new employee with all fields
          await conn.query(
            `INSERT INTO employees (
              employee_code, full_name, gender, birth_date, email, phone_number,
              address, city, province, postal_code, division, position, salary,
              join_date, employment_status, emergency_contact, emergency_phone,
              education, marital_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              empCode,
              empName,
              empGender || null,
              empBirthDate || null,
              empEmail,
              empPhoneNumber || null,
              empAddress || null,
              empCity || null,
              empProvince || null,
              empPostalCode || null,
              empDivision || null,
              empPosition || null,
              empSalary || null,
              empJoinDate || null,
              empStatus || 'Active',
              empEmergencyContact || null,
              empEmergencyPhone || null,
              empEducation || null,
              empMaritalStatus || null
            ]
          );
        }

        insertedCount++;
        console.log(`[v0] Row ${index + 1}: ✓ SUCCESS`);
      } catch (err) {
        failedCount++;
        const errMsg = `Row ${index + 2}: ${err.message}`;
        errors.push(errMsg);
        console.error(`[v0] Row ${index + 1}: ✗ FAILED -`, err.message);
        console.error(`[v0] Full error:`, err);
      }
    }

    conn.release();

    console.log(`[v0] ========== UPLOAD COMPLETE ==========`);
    console.log(`[v0] Success: ${insertedCount}, Failed: ${failedCount}, Total: ${data.length}`);

    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
      console.log('[v0] Uploaded file deleted');
    } catch (err) {
      console.error('[v0] Error deleting uploaded file:', err.message);
    }

    res.json({
      message: `Upload completed. ${insertedCount} records imported successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      fileName: fileName,
      insertedCount: insertedCount,
      totalRows: data.length,
      failedCount: failedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('[v0] ========== UPLOAD ERROR ==========');
    console.error('[v0] Error message:', error.message);
    console.error('[v0] Full error:', error);
    res.status(500).json({ message: 'Failed to upload file', error: error.message });
  }
});

// Bulk import employees
app.post('/api/employees/bulk-import', verifyToken, async (req, res) => {
  try {
    const { employees } = req.body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ message: 'No employees data provided' });
    }

    const conn = await pool.getConnection();
    let successCount = 0;
    let errorCount = 0;

    for (const emp of employees) {
      try {
        await conn.query(
          `INSERT INTO employees (
            employee_code, full_name, gender, birth_date, email, phone_number,
            address, city, province, postal_code, division, position, salary,
            join_date, employment_status, emergency_contact, emergency_phone,
            education, marital_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            emp.employee_code, emp.full_name, emp.gender, emp.birth_date, emp.email,
            emp.phone_number, emp.address, emp.city, emp.province, emp.postal_code,
            emp.division, emp.position, emp.salary, emp.join_date, emp.employment_status,
            emp.emergency_contact, emp.emergency_phone, emp.education, emp.marital_status
          ]
        );
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    conn.release();

    res.json({
      message: 'Bulk import completed',
      successCount,
      errorCount,
      total: employees.length,
    });
  } catch (error) {
    console.error('[v0] Bulk import error:', error.message);
    res.status(500).json({ message: 'Failed to import employees', error: error.message });
  }
});

// Export employees
app.get('/api/export/employees', verifyToken, async (req, res) => {
  try {
    const { format = 'excel', division = '', status = '' } = req.query;

    const conn = await pool.getConnection();

    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];

    if (division) {
      query += ' AND division = ?';
      params.push(division);
    }

    if (status) {
      query += ' AND employment_status = ?';
      params.push(status);
    }

    const [employees] = await conn.query(query, params);
    conn.release();

    if (format === 'excel') {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(employees);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

      const filename = `employees-${Date.now()}.xlsx`;
      const filepath = path.join(__dirname, 'public', 'uploads', filename);

      XLSX.writeFile(workbook, filepath);

      res.json({
        message: 'Export successful',
        filename: filename,
        url: `/uploads/${filename}`,
      });
    } else {
      res.json({
        message: 'Export successful',
        data: employees,
      });
    }
  } catch (error) {
    console.error('[v0] Export error:', error.message);
    res.status(500).json({ message: 'Failed to export data', error: error.message });
  }
});

// Export to Excel
app.get('/api/export/excel', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, division = '', status = '' } = req.query;

    const conn = await pool.getConnection();

    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];

    if (startDate) {
      query += ' AND join_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND join_date <= ?';
      params.push(endDate);
    }

    if (division) {
      query += ' AND division = ?';
      params.push(division);
    }

    if (status) {
      query += ' AND employment_status = ?';
      params.push(status);
    }

    const [employees] = await conn.query(query, params);
    conn.release();

    // Create Excel file
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(employees);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    const filename = `employees-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    // Send the file
    res.send(buffer);
  } catch (error) {
    console.error('[v0] Excel export error:', error.message);
    res.status(500).json({ message: 'Failed to export Excel data', error: error.message });
  }
});

// Export to PDF
app.get('/api/export/pdf', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, division = '', status = '' } = req.query;

    const conn = await pool.getConnection();

    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];

    if (startDate) {
      query += ' AND join_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND join_date <= ?';
      params.push(endDate);
    }

    if (division) {
      query += ' AND division = ?';
      params.push(division);
    }

    if (status) {
      query += ' AND employment_status = ?';
      params.push(status);
    }

    const [employees] = await conn.query(query, params);
    conn.release();

    const filename = `employees-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // A4 Landscape: 841.89 x 595.28 points
    const doc = new PDFDocument({
      size: [841.89, 595.28],
      margin: 20,
      bufferPages: true,
    });
    doc.pipe(res);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const contentHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

    // Header section
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1F2937').text('EMPLOYEE EXPORT REPORT', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
      .text(`Generated: ${new Date().toLocaleString()} | Total Records: ${employees.length}`, { align: 'center' });
    doc.moveDown(0.8);

    // Draw filter info if applied
    const filterInfo = [];
    if (startDate) filterInfo.push(`From: ${startDate}`);
    if (endDate) filterInfo.push(`To: ${endDate}`);
    if (division) filterInfo.push(`Division: ${division}`);
    if (status) filterInfo.push(`Status: ${status}`);

    if (filterInfo.length > 0) {
      doc.fontSize(9).font('Helvetica').fillColor('#555555')
        .text(filterInfo.join(' | '), { align: 'center' });
      doc.moveDown(0.6);
    }

    const headers = ['ID', 'Code', 'Name', 'Email', 'Division', 'Position', 'Status', 'Join Date'];
    // More balanced column widths to fit landscape A4
    const columnWidths = [30, 55, 110, 130, 80, 90, 70, 70];
    const totalColumnWidth = columnWidths.reduce((a, b) => a + b, 0) + (headers.length - 1) * 2;
    
    // Scale columns if they exceed page width
    const scale = (pageWidth - 10) / totalColumnWidth;
    const scaledColumnWidths = columnWidths.map(w => w * scale);
    const colGap = 2 * scale;

    const startX = doc.page.margins.left + 5;
    const headerHeight = 18;
    const rowHeight = 16;
    let currentY = doc.y;

    const getColumnX = (colIndex) => {
      let x = startX;
      for (let i = 0; i < colIndex; i++) {
        x += scaledColumnWidths[i] + colGap;
      }
      return x;
    };

    const drawTableHeader = () => {
      const headerY = currentY;

      // Header background
      doc.rect(startX, headerY, pageWidth - 10, headerHeight)
        .fillAndStroke('#2D3748', '#000000');

      // Header text
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF');
      headers.forEach((header, index) => {
        const cellX = getColumnX(index) + 4;
        const cellWidth = scaledColumnWidths[index] - 6;
        
        doc.text(header, cellX, headerY + 4, {
          width: cellWidth,
          height: headerHeight - 8,
          align: 'center',
          valign: 'center',
          ellipsis: true,
        });
      });

      currentY = headerY + headerHeight;
    };

    const drawRow = (rowData, rowIndex) => {
      // Check if we need a new page
      if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
        // Add page number to current page
        addPageNumber();
        
        // Add new page
        doc.addPage({ size: [841.89, 595.28], margin: 20 });
        currentY = doc.page.margins.top;
        drawTableHeader();
      }

      const rowY = currentY;

      // Alternate row background
      if (rowIndex % 2 === 0) {
        doc.rect(startX, rowY, pageWidth - 10, rowHeight)
          .fill('#F7FAFC');
      } else {
        doc.rect(startX, rowY, pageWidth - 10, rowHeight)
          .fill('#FFFFFF');
      }

      // Row border
      doc.rect(startX, rowY, pageWidth - 10, rowHeight)
        .stroke('#CBD5E0');

      // Row text
      doc.font('Helvetica').fontSize(8.5).fillColor('#1F2937');
      rowData.forEach((cell, index) => {
        const cellX = getColumnX(index) + 4;
        const cellWidth = scaledColumnWidths[index] - 6;
        
        const cellValue = (cell || '').toString().substring(0, 50);
        
        doc.text(cellValue, cellX, rowY + 2, {
          width: cellWidth,
          height: rowHeight - 4,
          align: index === 0 ? 'center' : 'left',
          valign: 'center',
          ellipsis: true,
        });
      });

      currentY = rowY + rowHeight;
    };

    let pageCount = 1;
    const addPageNumber = () => {
      const pageNumberY = doc.page.height - doc.page.margins.bottom + 5;
      doc.fontSize(8).font('Helvetica').fillColor('#999999');
      doc.text(`Page ${pageCount}`, 0, pageNumberY, { align: 'center' });
    };

    drawTableHeader();

    employees.forEach((emp, index) => {
      drawRow([
        (emp.id || '').toString(),
        emp.employee_code || '-',
        emp.full_name || '-',
        emp.email || '-',
        emp.division || '-',
        emp.position || '-',
        emp.employment_status || '-',
        emp.join_date ? new Date(emp.join_date).toLocaleDateString('id-ID') : '-',
      ], index);
    });

    // Add footer to last page
    addPageNumber();
    
    currentY = doc.page.height - doc.page.margins.bottom - 10;
    doc.fontSize(7.5).font('Helvetica').fillColor('#999999')
      .text('This is an automated report generated by HR Management System. For inquiries, contact HR Department.', 
            doc.page.margins.left, currentY, {
              width: pageWidth,
              align: 'center',
            });

    doc.end();
  } catch (error) {
    console.error('[v0] PDF export error:', error.message);
    res.status(500).json({ message: 'Failed to export PDF data', error: error.message });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Server startup
const PORT = process.env.API_PORT || 5000;
const HOST = process.env.API_HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log('[v0] ✓ Server started successfully');
  console.log(`[v0] ✓ Server running on http://${HOST}:${PORT}`);
  console.log('[v0] ✓ Health check: http://localhost:${PORT}/api/health');
  console.log('[v0] ✓ Database check: http://localhost:${PORT}/api/db-health');
});

module.exports = app;
