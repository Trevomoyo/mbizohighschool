const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Allow configuring allowed origins via env var (comma-separated). If not set, default to permissive for local dev.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
if (allowedOrigins.length > 0) {
    app.use(cors({ origin: allowedOrigins }));
    console.log('CORS configured for origins:', allowedOrigins);
} else {
    // No restriction (useful for local dev); set ALLOWED_ORIGINS in production to restrict.
    app.use(cors());
    console.log('CORS configured to allow all origins (set ALLOWED_ORIGINS to restrict)');
}
app.use(express.json());
app.use(express.static('public'));

// Serve static files from public directory
app.use('/css', express.static('public/css'));
app.use('/js', express.static('public/js'));

// Serve root image explicitly as a safe fallback (do not expose entire project root)
app.get('/image.png', (req, res) => {
    const rootImg = path.join(__dirname, 'image.png');
    const publicImg = path.join(__dirname, 'public', 'image.png');
    if (fs.existsSync(rootImg)) {
        // prefer serving the root file directly if it exists
        return res.sendFile(rootImg);
    }
    // fall back to public copy (if any)
    if (fs.existsSync(publicImg)) {
        return res.sendFile(publicImg);
    }
    return res.status(404).send('Not found');
});

// MongoDB Connection - improved validation, masking, and retry
const rawUri = (process.env.MONGODB_URI || 'mongodb://localhost:27017/mbizo-school').trim();

function maskMongoUri(uri){
    try{
        // Mask password if present
        return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:\/@]+):(.*?)(@)/, (m,p,user,pass,at)=>{
            const masked = pass ? '***' : '';
            return `${p}${user}:${masked}${at}`;
        });
    }catch(e){ return uri; }
}

function extractHostFromUri(uri){
    // Try to extract host for basic validation
    try{
        const m = uri.match(/@([^\/\?]+)/);
        if(m && m[1]) return m[1];
        // fallback for mongodb://host:port
        const m2 = uri.match(/mongodb(?:\+srv)?:\/\/(.*?)\//);
        if(m2 && m2[1]) return m2[1];
    }catch(e){}
    return null;
}

const masked = maskMongoUri(rawUri);
console.log('Using MongoDB URI:', masked);

const hostPart = extractHostFromUri(rawUri);
if(!hostPart || !hostPart.includes('.')){
    console.warn('Warning: MongoDB URI host looks suspicious or is missing domain/TLD:', hostPart);
    console.warn('If you intended to connect to MongoDB Atlas (mongodb+srv), ensure your URI host looks like "cluster0.xxxxxx.mongodb.net".');
    // continue — mongoose.connect will still attempt and produce a helpful error
}

async function connectWithRetry(uri, opts = { useNewUrlParser:true, useUnifiedTopology:true }){
    const maxAttempts = 5;
    for(let attempt=1; attempt<=maxAttempts; attempt++){
        try{
            await mongoose.connect(uri, opts);
            console.log('MongoDB connected successfully (attempt', attempt,')');
            return;
        }catch(err){
            console.error(`MongoDB connect attempt ${attempt} failed:`, err.message || err);
            if(attempt === maxAttempts) {
                console.error('All MongoDB connection attempts failed. Exiting.');
                console.error('Full error:', err);
                process.exit(1);
            }
            // small backoff
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
}

connectWithRetry(rawUri).then(() => startServer()).catch(err=>{
    console.error('Final MongoDB connection error:', err);
    process.exit(1);
});

// Models
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff', 'student', 'parent'], required: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    studentId: { type: String }, // for students
    class: { type: String }, // for students
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // for parents
    createdAt: { type: Date, default: Date.now }
});

const NoticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    timestamp: { type: Date, default: Date.now }
});

const StudentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    class: { type: String, required: true },
    attendance: { type: Number, default: 0 },
    performance: { type: Number, default: 0 },
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' }
});

const PaymentSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentName: { type: String, required: true },
    studentId: { type: String, required: true },
    paymentType: { type: String, required: true },
    amount: { type: Number, required: true },
    phone: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    transactionId: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const SMSSchema = new mongoose.Schema({
    recipient: { type: String, required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    timestamp: { type: Date, default: Date.now }
});

const ResourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    subject: { type: String, required: true },
    year: { type: Number, required: true },
    fileUrl: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
});

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, required: true },
    description: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
});

const PortfolioSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorType: { type: String, enum: ['student', 'teacher'], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    fileUrl: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Notice = mongoose.model('Notice', NoticeSchema);
const Student = mongoose.model('Student', StudentSchema);
const Payment = mongoose.model('Payment', PaymentSchema);
const SMS = mongoose.model('SMS', SMSSchema);
const Resource = mongoose.model('Resource', ResourceSchema);
const Event = mongoose.model('Event', EventSchema);
const Portfolio = mongoose.model('Portfolio', PortfolioSchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access token required' });

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, role, name, email, phone, studentId, class: studentClass } = req.body;

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            password: hashedPassword,
            role,
            name,
            email,
            phone,
            studentId,
            class: studentClass
        });

        await user.save();

        // Create student record if role is student
        if (role === 'student') {
            const student = new Student({
                user: user._id,
                name,
                class: studentClass
            });
            await student.save();
        }

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Notices API
app.get('/api/notices', async (req, res) => {
    try {
        const notices = await Notice.find().populate('author', 'name').sort({ timestamp: -1 });
        res.json(notices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/notices', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { title, content } = req.body;
        const notice = new Notice({
            title,
            content,
            author: req.user.id
        });
        await notice.save();
        res.status(201).json(notice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Students API
app.get('/api/students/:class', async (req, res) => {
    try {
        const students = await Student.find({ class: req.params.class }).populate('user', 'name email');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/students', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const students = await Student.find().populate('user', 'name email');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/students', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { name, studentId, class: studentClass, email, phone } = req.body;

        // Check if student ID already exists
        const existingStudent = await Student.findOne({
            $or: [
                { 'user.studentId': studentId },
                { name: name, class: studentClass }
            ]
        });

        if (existingStudent) {
            return res.status(400).json({ message: 'Student already exists with this ID or name in this class' });
        }

        // Create user account for student
        const hashedPassword = await bcrypt.hash('student123', 10); // Default password
        const user = new User({
            username: studentId.toLowerCase(),
            password: hashedPassword,
            role: 'student',
            name,
            email,
            phone,
            studentId,
            class: studentClass
        });

        await user.save();

        // Create student record
        const student = new Student({
            user: user._id,
            name,
            class: studentClass,
            attendance: 100,
            performance: 75,
            status: 'present'
        });

        await student.save();

        // Populate user data before sending response
        await student.populate('user', 'name email');

        res.status(201).json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/students/:id/attendance', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { status } = req.body;
        const student = await Student.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/students/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { name, class: studentClass, attendance, performance } = req.body;
        
        const student = await Student.findByIdAndUpdate(
            req.params.id,
            { name, class: studentClass, attendance, performance },
            { new: true }
        ).populate('user', 'name email');
        
        // Also update the user record
        if (student.user) {
            await User.findByIdAndUpdate(student.user._id, {
                name,
                class: studentClass
            });
        }
        
        res.json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/students/:id', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Delete associated user account
        if (student.user) {
            await User.findByIdAndDelete(student.user);
        }

        // Delete student record
        await Student.findByIdAndDelete(req.params.id);

        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Payments API
app.post('/api/payments', authenticateToken, async (req, res) => {
    try {
        const { studentName, studentId, paymentType, amount, phone } = req.body;

        const payment = new Payment({
            student: req.user.id,
            studentName,
            studentId,
            paymentType,
            amount,
            phone
        });

        await payment.save();

        // Integrate with EcoCash/OneMoney API (mock implementation)
        const paymentResult = await processPaymentAPI(payment);

        if (paymentResult.success) {
            payment.status = 'completed';
            payment.transactionId = paymentResult.transactionId;
            await payment.save();
        }

        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/payments', authenticateToken, async (req, res) => {
    try {
        let payments;
        if (req.user.role === 'admin' || req.user.role === 'staff') {
            payments = await Payment.find().populate('student', 'name');
        } else {
            payments = await Payment.find({ student: req.user.id });
        }
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// SMS API
app.post('/api/sms', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { recipient, type, message } = req.body;

        const sms = new SMS({
            recipient,
            type,
            message
        });

        await sms.save();

        // Send SMS via API (mock implementation)
        await sendSMSAPI(sms);

        res.status(201).json(sms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/sms', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const smsHistory = await SMS.find().sort({ timestamp: -1 }).limit(50);
        res.json(smsHistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Resources API
app.get('/api/resources', async (req, res) => {
    try {
        const { category } = req.query;
        let query = {};
        if (category && category !== 'all') {
            if (category === 'papers') {
                query.type = 'Past Paper';
            } else if (category === 'notes') {
                query.type = 'Study Notes';
            } else {
                query.category = category;
            }
        }
        const resources = await Resource.find(query).populate('uploadedBy', 'name').sort({ timestamp: -1 });
        res.json(resources);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/resources', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { title, type, category, subject, year, fileUrl } = req.body;
        const resource = new Resource({
            title,
            type,
            category,
            subject,
            year,
            fileUrl,
            uploadedBy: req.user.id
        });
        await resource.save();
        res.status(201).json(resource);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Events API
app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find().populate('createdBy', 'name').sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/events', authenticateToken, authorizeRoles('admin', 'staff'), async (req, res) => {
    try {
        const { title, date, type, description } = req.body;
        const event = new Event({
            title,
            date,
            type,
            description,
            createdBy: req.user.id
        });
        await event.save();
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Portfolios API
app.get('/api/portfolios', async (req, res) => {
    try {
        const { category } = req.query;
        let query = {};
        if (category && category !== 'all') {
            query.authorType = category;
        }
        const portfolios = await Portfolio.find(query).populate('author', 'name').sort({ timestamp: -1 });
        res.json(portfolios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/portfolios', authenticateToken, async (req, res) => {
    try {
        const { title, description, category, fileUrl } = req.body;
        const portfolio = new Portfolio({
            author: req.user.id,
            authorType: req.user.role === 'student' ? 'student' : 'teacher',
            title,
            description,
            category,
            fileUrl
        });
        await portfolio.save();
        res.status(201).json(portfolio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Chatbot API
app.post('/api/chat', async (req, res) => {
    try {
        // message may be provided in the body; ensure it's available in both try and catch
        const message = (req.body && typeof req.body.message === 'string') ? req.body.message : '';

        // Choose HF model via env or default to a conversational model
        const hfModel = process.env.HF_MODEL || process.env.HUGGINGFACE_MODEL || 'microsoft/DialoGPT-medium';

        // Call Hugging Face inference endpoint
        // Many HF models accept a simple `{ inputs: "text" }` payload. Use that shape for broad compatibility.
        const hfUrl = `https://api-inference.huggingface.co/models/${hfModel}`;
        console.log('Calling Hugging Face model:', hfModel);
        const response = await axios.post(hfUrl, {
            inputs: message,
            parameters: {
                max_new_tokens: 128,
                temperature: 0.7,
                do_sample: true
            }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        // Try to extract a generated text from common HF response shapes
        let botResponse = "I'm sorry, I couldn't understand that. How can I help you with school-related information?";
        if (response && response.data) {
            if (typeof response.data === 'string') {
                botResponse = response.data;
            } else if (response.data.generated_text) {
                botResponse = response.data.generated_text;
            } else if (Array.isArray(response.data) && response.data[0] && response.data[0].generated_text) {
                botResponse = response.data[0].generated_text;
            } else if (response.data.hasOwnProperty('error')) {
                console.warn('HF response error:', response.data.error);
            }
        }

        // Enhance response with school-specific context
        botResponse = enhanceWithSchoolContext(botResponse, message);

        return res.json({ response: botResponse });
    } catch (error) {
        // Provide helpful logs and a resilient fallback.
        console.error('Chatbot API error:', error && error.message ? error.message : error);
        if (error && error.response && error.response.status === 410) {
            console.error('Hugging Face model returned 410 Gone — the model may be retired or unavailable. Check HF_MODEL / HUGGINGFACE_MODEL env and choose a valid model.');
        }

        // Use the incoming message if available, otherwise empty string
        const incomingMessage = (req.body && typeof req.body.message === 'string') ? req.body.message : '';
        const botResponse = generateEnhancedResponse(incomingMessage);
        return res.json({ response: botResponse });
    }
});

// Contact form API
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        // Here you would typically send an email or save to database
        console.log('Contact form submission:', { name, email, message });
        res.json({ message: 'Message sent successfully!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Helper functions
async function processPaymentAPI(payment) {
    // Mock EcoCash/OneMoney API integration
    // In real implementation, you would call actual payment APIs
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: Math.random() > 0.1, // 90% success rate
                transactionId: 'TXN' + Date.now()
            });
        }, 2000);
    });
}

async function sendSMSAPI(sms) {
    // Mock SMS API integration
    // In real implementation, you would use services like Twilio, Africa's Talking, etc.
    console.log('Sending SMS:', sms);
}

function enhanceWithSchoolContext(botResponse, userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const lowerResponse = botResponse.toLowerCase();

    // If the AI response doesn't contain school-specific info, enhance it
    if (!lowerResponse.includes('school') && !lowerResponse.includes('mbizo') && !lowerResponse.includes('zimsec')) {
        if (lowerMessage.includes('fee') || lowerMessage.includes('payment') || lowerMessage.includes('pay')) {
            return botResponse + " For Mbizo High School, you can pay school fees through our payment portal. We accept EcoCash, OneMoney, and bank transfers. Term fees are due by the 15th of each month.";
        }

        if (lowerMessage.includes('exam') || lowerMessage.includes('test') || lowerMessage.includes('zimsec')) {
            return botResponse + " At Mbizo High School, exam timetables are available in the Notices section. You can also find ZIMSEC past papers and revision materials in our Resources section.";
        }

        if (lowerMessage.includes('event') || lowerMessage.includes('calendar') || lowerMessage.includes('when')) {
            return botResponse + " Check Mbizo High School's Calendar for all upcoming events! Sports Day is on February 15th, Parent-Teacher meetings are scheduled for the last Friday of each month.";
        }

        if (lowerMessage.includes('paper') || lowerMessage.includes('notes') || lowerMessage.includes('study')) {
            return botResponse + " Visit Mbizo High School's ZIMSEC Resources section for past papers, study notes, and revision guides for all subjects. We have materials for both O-Level and A-Level students!";
        }

        if (lowerMessage.includes('attendance') || lowerMessage.includes('absent') || lowerMessage.includes('present')) {
            return botResponse + " At Mbizo High School, parents can view their child's attendance in real-time through our Attendance Tracker. We send SMS notifications for absences. Current term attendance requirement is 85%.";
        }

        if (lowerMessage.includes('contact') || lowerMessage.includes('email') || lowerMessage.includes('phone')) {
            return botResponse + " You can reach Mbizo High School at:\n📞 +263 40067\n📧 info@mbizohigh.ac.zw\n📍 3VW5+WJF, Mbizo, Kwekwe\nOffice hours: Mon-Fri, 7:30 AM - 4:00 PM";
        }
    }

    return botResponse;
}

function generateEnhancedResponse(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('fee') || lowerMessage.includes('payment') || lowerMessage.includes('pay')) {
        return "You can pay school fees through our payment portal at Mbizo High School. Click on 'EcoCash Payments' in the features section. We accept EcoCash, OneMoney, and bank transfers. Term fees are due by the 15th of each month.";
    }

    if (lowerMessage.includes('exam') || lowerMessage.includes('test') || lowerMessage.includes('zimsec')) {
        return "Exam timetables are available in the Notices section at Mbizo High School. You can also find ZIMSEC past papers and revision materials in our Resources section. Mid-term exams start next month!";
    }

    if (lowerMessage.includes('event') || lowerMessage.includes('calendar') || lowerMessage.includes('when')) {
        return "Check our School Calendar for all upcoming events at Mbizo High School! Sports Day is on February 15th, Parent-Teacher meetings are scheduled for the last Friday of each month.";
    }

    if (lowerMessage.includes('paper') || lowerMessage.includes('notes') || lowerMessage.includes('study')) {
        return "Visit our ZIMSEC Resources section for past papers, study notes, and revision guides for all subjects at Mbizo High School. We have materials for both O-Level and A-Level students!";
    }

    if (lowerMessage.includes('attendance') || lowerMessage.includes('absent') || lowerMessage.includes('present')) {
        return "Parents can view their child's attendance in real-time through our Attendance Tracker at Mbizo High School. We send SMS notifications for absences. Current term attendance requirement is 85%.";
    }

    if (lowerMessage.includes('contact') || lowerMessage.includes('email') || lowerMessage.includes('phone')) {
        return "You can reach Mbizo High School at:\n📞 +263 40067\n📧 info@mbizohigh.ac.zw\n📍 3VW5+WJF, Mbizo, Kwekwe\nOffice hours: Mon-Fri, 7:30 AM - 4:00 PM";
    }

    return "I'm here to help with information about Mbizo High School. I can assist with fees, exams, events, resources, attendance, and more. What would you like to know?";
}

// Initialize sample data
async function initializeSampleData() {
    try {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            // Create sample users
            const hashedPassword = await bcrypt.hash('password123', 10);

            const admin = new User({
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                name: 'School Administrator',
                email: 'admin@mbizohigh.ac.zw'
            });
            await admin.save();

            const teacher = new User({
                username: 'teacher1',
                password: hashedPassword,
                role: 'staff',
                name: 'Mrs. Chikwava',
                email: 'chikwava@mbizohigh.ac.zw'
            });
            await teacher.save();

            const student = new User({
                username: 'student1',
                password: hashedPassword,
                role: 'student',
                name: 'Tafadzwa Moyo',
                email: 'tafadzwa@student.mbizo.ac.zw',
                studentId: 'STU001',
                class: 'form4a'
            });
            await student.save();

            // Create sample students for all classes
            const classes = [
                'form1a', 'form1b', 'form1c', 'form1d', 'form1e', 'form1f', 'form1g', 'form1h', 'form1i', 'form1j',
                'form2a', 'form2b', 'form2c', 'form2d', 'form2e', 'form2f', 'form2g', 'form2h', 'form2i', 'form2j',
                'form3a', 'form3b', 'form3c', 'form3d', 'form3e', 'form3f', 'form3g', 'form3h', 'form3i', 'form3j',
                'form4a', 'form4b', 'form4c', 'form4d', 'form4e', 'form4f', 'form4g', 'form4h', 'form4i', 'form4j',
                'l6', 'u6'
            ];
            const sampleNames = [
                'Tafadzwa Moyo', 'Rutendo Ncube', 'Tinashe Dube', 'Chipo Mlambo',
                'Farai Sibanda', 'Rumbi Chikwava'
            ];

            for (const cls of classes) {
                for (let i = 0; i < 5; i++) {
                    const name = sampleNames[i % sampleNames.length] + ` ${cls} ${i}`;
                    const studentRecord = new Student({
                        user: null, // No user for sample
                        name,
                        class: cls,
                        attendance: Math.floor(Math.random() * 20) + 80,
                        performance: Math.floor(Math.random() * 30) + 70,
                        status: 'present'
                    });
                    await studentRecord.save();
                }
            }

            // Create sample notices
            const notices = [
                {
                    title: 'Welcome Back to Term 1',
                    content: 'School reopens on January 9th, 2025. All students should report by 8:00 AM.',
                    author: admin._id
                },
                {
                    title: 'ZIMSEC Exam Registration',
                    content: 'Registration for November 2025 ZIMSEC examinations is now open. All Form 4 students must register by March 31st.',
                    author: admin._id
                },
                {
                    title: 'Parent-Teacher Meeting',
                    content: 'The first Parent-Teacher meeting of the term will be held on February 15th, 2025 at 2:00 PM.',
                    author: admin._id
                }
            ];

            for (const noticeData of notices) {
                const notice = new Notice(noticeData);
                await notice.save();
            }

            // Create sample ZIMSEC resources
            const resources = [
                {
                    title: 'Mathematics Paper 1 - 2024',
                    type: 'Past Paper',
                    category: 'Mathematics',
                    subject: 'Mathematics',
                    year: 2024,
                    fileUrl: 'https://example.com/math-paper-1-2024.pdf',
                    uploadedBy: admin._id
                },
                {
                    title: 'English Literature Notes',
                    type: 'Study Notes',
                    category: 'English',
                    subject: 'English Literature',
                    year: 2024,
                    fileUrl: 'https://example.com/english-lit-notes.pdf',
                    uploadedBy: admin._id
                },
                {
                    title: 'Chemistry Practical Guide',
                    type: 'Study Notes',
                    category: 'Science',
                    subject: 'Chemistry',
                    year: 2024,
                    fileUrl: 'https://example.com/chemistry-practical-guide.pdf',
                    uploadedBy: admin._id
                },
                {
                    title: 'History Revision Questions',
                    type: 'Past Paper',
                    category: 'History',
                    subject: 'History',
                    year: 2023,
                    fileUrl: 'https://example.com/history-revision-questions.pdf',
                    uploadedBy: admin._id
                },
                {
                    title: 'Geography Map Work',
                    type: 'Study Notes',
                    category: 'Geography',
                    subject: 'Geography',
                    year: 2024,
                    fileUrl: 'https://example.com/geography-map-work.pdf',
                    uploadedBy: admin._id
                },
                {
                    title: 'Physics Formula Sheet',
                    type: 'Study Notes',
                    category: 'Science',
                    subject: 'Physics',
                    year: 2024,
                    fileUrl: 'https://example.com/physics-formula-sheet.pdf',
                    uploadedBy: admin._id
                }
            ];

            for (const resourceData of resources) {
                const resource = new Resource(resourceData);
                await resource.save();
            }

            console.log('Sample data initialized');
        }
    } catch (error) {
        console.error('Error initializing sample data:', error);
    }
}

// Start server (called after DB connection)
function startServer(){
    app.listen(PORT, async () => {
        console.log(`Server running on port ${PORT}`);
        // Copy image.png from project root into public/ if present so static serving works reliably.
        try {
            const rootImage = path.join(__dirname, 'image.png');
            const destImage = path.join(__dirname, 'public', 'image.png');
            if (fs.existsSync(rootImage)) {
                try {
                    fs.copyFileSync(rootImage, destImage);
                    console.log('Copied image.png to public/');
                } catch (copyErr) {
                    console.error('Failed to copy image.png to public/:', copyErr);
                }
            } else {
                // no root image found — nothing to copy
            }

            await initializeSampleData();
        } catch(err){
            console.error('Error during startup tasks:', err);
        }
    });
}