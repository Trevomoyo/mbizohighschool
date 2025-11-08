# Mbizo High School Management System

A comprehensive school management system built with Node.js, Express, MongoDB, and modern web technologies.

## Features

### 🏫 Core Features
- **Student Management**: Track attendance, performance, and student information
- **Fee Payment System**: Secure payments via EcoCash and OneMoney
- **SMS Notifications**: Automated messaging to parents and students
- **ZIMSEC Resources**: Access to past papers and study materials
- **School Calendar**: Event management and scheduling
- **Student Portfolios**: Showcase achievements and creative work
- **Notice Board**: School announcements and updates

### 🔐 Authentication & Authorization
- **Role-based Access Control**: Admin, Staff, Student, and Parent roles
- **JWT Authentication**: Secure token-based authentication
- **Profile Management**: User account management

### 🤖 AI Integration
- **AI Chat Assistant**: Powered by Hugging Face API for intelligent responses
- **Contextual Help**: School-specific assistance and information

### 💳 Payment Integration
- **EcoCash API**: Mobile money payments for Zimbabwe
- **OneMoney API**: Alternative payment method
- **Transaction Tracking**: Complete payment history and receipts

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with modern design
- **Vanilla JavaScript** - Interactivity
- **Responsive Design** - Mobile-friendly interface

### APIs & Integrations
- **Hugging Face API** - AI chatbot
- **EcoCash API** - Mobile payments
- **OneMoney API** - Mobile payments
- **SMS API** - Bulk messaging

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mbizo-high-school
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **MongoDB Atlas Setup**
   - Follow the detailed guide in `MONGODB_ATLAS_SETUP.md`
   - Create a free MongoDB Atlas cluster
   - Get your connection string

4. **Environment Configuration**
   - Update the `.env` file with your MongoDB Atlas credentials:
     ```env
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mbizo-school?retryWrites=true&w=majority
     JWT_SECRET=your-super-secret-jwt-key
     HUGGINGFACE_API_KEY=your-huggingface-api-key
     ECOCASH_API_KEY=your-ecocash-api-key
     ONEMONEY_API_KEY=your-onemoney-api-key
     SMS_API_KEY=your-sms-api-key
     PORT=5000
     ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

6. **Access the application**
   - Main Website: `https://mbizohighschool.onrender.com/index.html`
   - Login: `https://mbizohighschool.onrender.com/login.html`
   - Dashboard: `https://mbizohighschool.onrender.com/dashboard.html`
   - API: `https://mbizohighschool.onrender.com/api`

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Core Endpoints
- `GET /api/notices` - Get school notices
- `POST /api/notices` - Create notice (Admin/Staff only)
- `GET /api/students/:class` - Get students by class
- `PUT /api/students/:id/attendance` - Update attendance
- `POST /api/payments` - Process payment
- `GET /api/payments` - Get payment history
- `POST /api/sms` - Send SMS notification
- `GET /api/sms` - Get SMS history
- `GET /api/resources` - Get study resources
- `POST /api/resources` - Upload resource
- `GET /api/events` - Get calendar events
- `POST /api/events` - Create event
- `GET /api/portfolios` - Get student portfolios
- `POST /api/portfolios` - Upload portfolio
- `POST /api/chat` - AI chat interaction
- `POST /api/contact` - Contact form submission

## User Roles & Permissions

### Admin
- Full system access
- User management
- Notice management
- Student management (add/edit/delete)
- All staff permissions

### Staff (Teachers)
- Attendance management (add/edit students)
- SMS notifications
- Resource uploads
- Event management
- Student performance tracking

### Students
- View personal attendance
- Access resources
- View calendar
- Upload portfolios
- Make payments

### Parents
- View child's attendance
- Make payments
- Receive SMS notifications
- Access resources

## New Features Added

### Enhanced Attendance Tracker
- **Add New Students**: Staff and admins can add new students with full details
- **Edit Student Information**: Update student names, classes, and performance data
- **Delete Students**: Remove students and their associated user accounts
- **Real-time Updates**: All changes sync with MongoDB Atlas
- **Role-based Access**: Only staff and admins can manage students

### Improved Architecture
- **Separated CSS**: All styles moved to external CSS files for better maintainability
- **Modular JavaScript**: API functions and attendance management in separate files
- **MongoDB Atlas Integration**: Cloud database with automatic scaling
- **Enhanced Security**: Improved error handling and validation

## Database Schema

### User Model
```javascript
{
  username: String,
  password: String, // hashed
  role: String, // admin, staff, student, parent
  name: String,
  email: String,
  phone: String,
  studentId: String, // for students
  class: String, // for students
  children: [ObjectId], // for parents
  createdAt: Date
}
```

### Other Models
- **Notice**: School announcements
- **Student**: Student records with attendance/performance
- **Payment**: Fee payment transactions
- **SMS**: Message history
- **Resource**: Study materials
- **Event**: Calendar events
- **Portfolio**: Student achievements

## Development

### Project Structure
```
mbizo-high-school/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── login.html            # Login page
├── dashboard.html        # Main dashboard
├── mbizo_high_school (1).html  # Public website
├── README.md             # This file
└── public/               # Static files (if needed)
```

### Key Files
- `server.js` - Express server with all API routes
- `login.html` - Authentication interface
- `dashboard.html` - Role-based dashboard
- `mbizo_high_school (1).html` - Public school website

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mbizo-school
JWT_SECRET=your-production-jwt-secret
HUGGINGFACE_API_KEY=your-production-huggingface-key
# Add other API keys for production
```

### Deployment Steps
1. Set up production MongoDB instance
2. Configure environment variables
3. Build and deploy to hosting service (Heroku, DigitalOcean, etc.)
4. Set up SSL certificate
5. Configure domain and DNS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@mbizohigh.ac.zw
- Phone: +263 40067

## Acknowledgments

- Built for Mbizo High School, Kwekwe, Zimbabwe
- Powered by ModernizeFlow
- Uses free APIs for AI and payment integration