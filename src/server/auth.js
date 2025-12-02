const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

// Secret key for JWT - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Register a new user
async function register(username, password) {
    // Validate input
    if (!username || username.length < 3 || username.length > 20) {
        throw new Error('Username must be 3-20 characters');
    }
    if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = db.createUser(username, passwordHash);

    // Generate token
    const token = generateToken(user.id);

    return { user: { id: user.id, username: user.username }, token };
}

// Login user
async function login(username, password) {
    // Find user
    const user = db.getUserByUsername(username);
    if (!user) {
        throw new Error('Invalid username or password');
    }

    // Check password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        throw new Error('Invalid username or password');
    }

    // Generate token
    const token = generateToken(user.id);

    return {
        user: { id: user.id, username: user.username },
        token
    };
}

// Generate JWT token
function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.userId;
    } catch (error) {
        return null;
    }
}

// Middleware to authenticate requests
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const userId = verifyToken(token);

    if (!userId) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const user = db.getUserById(userId);
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
}

// Setup auth routes
function setupAuthRoutes(app) {
    // Register
    app.post('/api/register', async (req, res) => {
        try {
            const { username, password } = req.body;
            const result = await register(username, password);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // Login
    app.post('/api/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            const result = await login(username, password);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // Get current user
    app.get('/api/me', authMiddleware, (req, res) => {
        res.json({ user: req.user });
    });
}

module.exports = {
    register,
    login,
    verifyToken,
    authMiddleware,
    setupAuthRoutes
};
