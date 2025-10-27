# 🚀 How to Run the MACALALAY Review Center Web Application

## 📋 Prerequisites
Make sure you have these installed on your computer:
- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **Python** (version 3.8 or higher) - [Download here](https://python.org/)
- **Git** (optional) - [Download here](https://git-scm.com/)

## 🎯 Quick Start (3 Steps)

### Step 1: Navigate to the Project Directory
Open **Command Prompt** or **PowerShell** and run:
```bash
cd C:\Users\User\Desktop\MACALALAY-upd\web-app
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the Application
```bash
npm run dev
```

**That's it!** 🎉 The application will be running at: **http://localhost:3000**

---

## 🔐 Default Login Credentials

### Admin Account
- **Email**: `admin@reviewcenter.com`
- **Password**: `admin123`
- **Access**: Full admin panel, question management, user management

### Student Account
- **Email**: `student@reviewcenter.com`
- **Password**: `student123`
- **Access**: Take tests, view results, dashboard

---

## 🛠️ Detailed Setup Instructions

### 1. First Time Setup
If this is your first time running the application:

```bash
# Navigate to project directory
cd C:\Users\User\Desktop\MACALALAY-upd\web-app

# Install all required packages
npm install

# Set up the database
npx prisma generate
npx prisma db push

# Seed the database with initial data
npx prisma db seed
```

### 2. Running the Application
```bash
# Start the development server
npm run dev
```

### 3. Accessing the Application
- Open your web browser
- Go to: **http://localhost:3000**
- Login with the credentials above

---

## 🎮 How to Use the Application

### For Students:
1. **Login** → Use student credentials
2. **Dashboard** → View your progress and study plan
3. **Take Test** → Click "Start Pre-Test" or "Start Post-Test"
4. **View Results** → See your scores and question breakdown
5. **Profile** → Update your information

### For Admins:
1. **Login** → Use admin credentials
2. **Admin Panel** → Manage questions, cohorts, users
3. **Question Bank** → Add, edit, delete questions
4. **Cohort Management** → Manage student groups
5. **Export Data** → Download reports as CSV

---

## 🔧 Troubleshooting

### Common Issues:

#### "npm: command not found"
- **Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)

#### "Port 3000 is already in use"
- **Solution**: Kill the process or use a different port:
```bash
npm run dev -- -p 3001
```

#### "Database connection error"
- **Solution**: Reset the database:
```bash
npx prisma db push --force-reset
npx prisma db seed
```

#### "Invalid credentials" when logging in
- **Solution**: Make sure the database is seeded:
```bash
npx prisma db seed
```

---

## 📱 Features Available

### ✅ Working Features:
- **User Authentication** (Login/Register)
- **Test Taking Interface** (Pre-test/Post-test)
- **Results & Analytics** (Scores, breakdowns)
- **Admin Panel** (Question management, user management)
- **Dashboard** (Progress tracking, study plans)
- **Mobile Responsive** (Works on phones/tablets)
- **Data Export** (CSV downloads)

### 🔄 Optional Features:
- **ML Recommendations** (Requires Python ML API)
- **Google Calendar Sync** (Future enhancement)
- **Email Notifications** (Future enhancement)

---

## 🚀 Advanced Usage

### Running with ML Recommendations:
1. **Start Python ML API** (in a separate terminal):
```bash
cd C:\Users\User\Desktop\MACALALAY-upd
python ml_recommendations_api.py
```

2. **Start Web Application** (in another terminal):
```bash
cd C:\Users\User\Desktop\MACALALAY-upd\web-app
npm run dev
```

### Stopping the Application:
- Press **Ctrl + C** in the terminal where `npm run dev` is running

### Restarting the Application:
```bash
# Stop the current process (Ctrl + C)
# Then run again:
npm run dev
```

---

## 📊 System Requirements

### Minimum Requirements:
- **RAM**: 4GB
- **Storage**: 1GB free space
- **Internet**: Required for initial setup only

### Recommended Requirements:
- **RAM**: 8GB
- **Storage**: 2GB free space
- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

---

## 🆘 Need Help?

### If something doesn't work:
1. **Check the terminal** for error messages
2. **Restart the application** (Ctrl + C, then `npm run dev`)
3. **Clear browser cache** and refresh the page
4. **Check if port 3000 is free** (close other applications using it)

### Common Commands Reference:
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Reset database
npx prisma db push --force-reset

# Seed database
npx prisma db seed

# View database
npx prisma studio
```

---

## 🎉 You're All Set!

The MACALALAY Review Center is now ready to use. Students can take tests, view their progress, and admins can manage the entire system through the web interface.

**Happy Learning!** 📚✨
