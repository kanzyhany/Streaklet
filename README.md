# 🌿 Streaklet - Smart Habit Tracker

A full-stack habit tracking application with streak management, progress analytics, and smart insights. Built with Node.js, Express, MongoDB, and vanilla HTML/CSS/JavaScript.

![Streaklet Dashboard](https://via.placeholder.com/800x400/4A7C59/FFFFFF?text=Streaklet+Dashboard)

## ✨ Features

### Core Features
- **🔐 Authentication** - JWT-based user registration and login
- **📝 Habit Management** - Create, edit, delete habits with custom categories, icons, and colors
- **📅 Flexible Scheduling** - Set habits for specific days of the week
- **⏰ Reminder Times** - Configure when you want to be reminded

### Streak System
- **🔥 Current Streak** - Track consecutive days of completion
- **🏆 Longest Streak** - Your personal best record
- **📊 Streak Analytics** - See your best performing habits

### Dashboard
- **📋 Today's Habits** - View and manage habits scheduled for today
- **✅ Quick Actions** - Mark habits as Done, In Progress, Skipped, or Missed
- **🎯 Progress Ring** - Visual percentage of today's completion
- **📈 Weekly Overview** - Bar chart showing daily completion rates

### Progress & Analytics
- **📊 Weekly/Monthly Charts** - Visualize your habit completion trends
- **⭐ Best Streaks** - See your top performing habits
- **💡 Habit Insights** - Discover patterns like best day and time for habits

### Settings
- **👤 Profile Management** - Update name and timezone
- **🔔 Notifications** - Toggle reminder preferences
- **🌙 Dark Mode** - Coming soon!

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database (with Mongoose ODM)
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling (Custom design system)
- **Vanilla JavaScript** - Interactivity
- **Fetch API** - HTTP requests

## 📁 Project Structure

```
task 1/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js  # Auth logic
│   │   ├── habitController.js # Habit CRUD
│   │   ├── logController.js   # Habit logging
│   │   └── statsController.js # Analytics
│   ├── middleware/
│   │   └── auth.js            # JWT verification
│   ├── models/
│   │   ├── User.js
│   │   ├── Habit.js
│   │   ├── HabitLog.js
│   │   └── Streak.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── habits.js
│   │   ├── logs.js
│   │   └── stats.js
│   ├── .env                   # Environment variables
│   ├── package.json
│   └── server.js              # Entry point
│
├── frontend/
│   ├── css/
│   │   └── styles.css         # Design system
│   ├── js/
│   │   ├── api.js             # API service
│   │   ├── auth.js            # Auth handling
│   │   ├── dashboard.js       # Dashboard logic
│   │   ├── progress.js        # Progress page
│   │   └── settings.js        # Settings page
│   ├── index.html             # Dashboard
│   ├── login.html
│   ├── register.html
│   ├── progress.html
│   └── settings.html
│
├── .gitignore
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   cd "Smart Habit Tracker/task 1"
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**
   
   Edit `backend/.env` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017/streaklet
   JWT_SECRET=your-super-secret-key-change-this
   PORT=5000
   NODE_ENV=development
   ```

   For MongoDB Atlas, use:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/streaklet
   ```

4. **Start MongoDB** (if using local installation)
   ```bash
   mongod
   ```

5. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   The API will be available at `http://localhost:5000`

6. **Open the frontend**
   
   Open `frontend/index.html` in your browser, or use a local server:
   ```bash
   cd frontend
   npx serve .
   ```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Habits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits` | Get all habits |
| GET | `/api/habits/today` | Get today's habits |
| POST | `/api/habits` | Create habit |
| PUT | `/api/habits/:id` | Update habit |
| DELETE | `/api/habits/:id` | Delete habit |

### Habit Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/habits/:id/log` | Log habit status |
| GET | `/api/habits/:id/logs` | Get habit logs |

### Statistics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats/today` | Today's progress |
| GET | `/api/stats/weekly` | Weekly stats |
| GET | `/api/stats/monthly` | Monthly stats |
| GET | `/api/stats/streaks` | Streak data |
| GET | `/api/stats/insights` | Habit insights |

## 🎨 Design System

The app uses a warm, nature-inspired color palette:

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Green | `#4A7C59` | Brand color, buttons, accents |
| Accent Orange | `#E07B39` | Streaks, fire icons |
| Accent Red | `#D94B3D` | Missed habits, errors |
| Background Cream | `#FDF8F3` | Main background |
| Text Dark | `#2D3748` | Primary text |

## 🧪 Testing the API

Use Thunder Client, Postman, or curl to test:

```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create a habit (replace TOKEN with your JWT)
curl -X POST http://localhost:5000/api/habits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"Morning Workout","category":"Health","icon":"💪"}'
```

## 📌 Resume-Worthy Bullet Point

> Built a full-stack habit tracker with streak logic, smart reminders, analytics dashboards, and JWT authentication; implemented MongoDB data models, RESTful APIs, and a responsive vanilla JS frontend with real-time user insights.

## 🔮 Future Enhancements

- [ ] Email reminders with Nodemailer
- [ ] Push notifications
- [ ] Google OAuth login
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Habit templates
- [ ] Social sharing
- [ ] Export data to CSV

## 📄 License

MIT License - feel free to use this project for learning and building!

---

Made with 💚 by a passionate developer
