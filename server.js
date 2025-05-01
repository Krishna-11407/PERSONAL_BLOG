const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files with debugging
app.use(express.static('public', {
    setHeaders: (res, path) => {
        console.log('Serving static file:', path);
    }
}));

// Add a test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// MongoDB Connection with more detailed error handling
mongoose.connect('mongodb://localhost:27017/blog', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Successfully connected to MongoDB.');
    // Test the connection by creating a test post
    const testPost = new Post({
        title: 'Test Post',
        content: 'Testing MongoDB connection',
        author: 'System'
    });
    return testPost.save();
}).then(() => {
    console.log('Test post created successfully. MongoDB is working correctly.');
}).catch((error) => {
    console.error('MongoDB Connection Error:', error);
    process.exit(1); // Exit if MongoDB connection fails
});

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    date: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

// Blog Post Schema
const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Add email validation function
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Add email domain validation function
const isValidEmailDomain = async (email) => {
    const domain = email.split('@')[1];
    try {
        const dns = require('dns').promises;
        await dns.resolveMx(domain);
        return true;
    } catch (error) {
        return false;
    }
};

// Create email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com', // Replace with your Gmail
        pass: 'your-app-password' // Replace with your app password
    }
});

// Store verification codes temporarily (in production, use Redis or similar)
const verificationCodes = new Map();

// Generate verification code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
const sendVerificationEmail = async (email, code) => {
    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Verify Your Email',
        html: `
            <h1>Email Verification</h1>
            <p>Your verification code is: <strong>${code}</strong></p>
            <p>This code will expire in 10 minutes.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

// Auth Routes
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, verificationCode } = req.body;

        // Verify the code first
        const storedData = verificationCodes.get(email);
        if (!storedData || storedData.code !== verificationCode) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            verified: true // Mark as verified since we've verified the email
        });

        await user.save();
        verificationCodes.delete(email); // Clean up verification code

        // Create token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Blog Routes
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Error fetching posts' });
    }
});

app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Error fetching post' });
    }
});

app.post('/api/posts', authenticateToken, async (req, res) => {
    try {
        const { title, content, author } = req.body;
        const post = new Post({
            title,
            content,
            author,
            userId: req.user.userId
        });

        const newPost = await post.save();
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Error creating post' });
    }
});

// Add new route for sending verification code
app.post('/api/send-verification', async (req, res) => {
    try {
        const { email } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Generate and store verification code
        const code = generateVerificationCode();
        verificationCodes.set(email, {
            code,
            timestamp: Date.now()
        });

        // Send verification email
        const emailSent = await sendVerificationEmail(email, code);
        if (!emailSent) {
            return res.status(500).json({ message: 'Failed to send verification email' });
        }

        res.json({ message: 'Verification code sent successfully' });
    } catch (error) {
        console.error('Error sending verification code:', error);
        res.status(500).json({ message: 'Error sending verification code' });
    }
});

// Add new route for verifying code
app.post('/api/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        const storedData = verificationCodes.get(email);

        if (!storedData) {
            return res.status(400).json({ message: 'No verification code found for this email' });
        }

        // Check if code is expired (10 minutes)
        if (Date.now() - storedData.timestamp > 10 * 60 * 1000) {
            verificationCodes.delete(email);
            return res.status(400).json({ message: 'Verification code expired' });
        }

        if (storedData.code !== code) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Code is valid
        verificationCodes.delete(email);
        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Error verifying code:', error);
        res.status(500).json({ message: 'Error verifying code' });
    }
});

// Add a catch-all route to serve index.html
app.get('*', (req, res) => {
    console.log('Request received for:', req.url);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Try accessing: http://localhost:${PORT}`);
});
