# ICOPSYCH Review Center - Web Application

A comprehensive web-based review system for psychology students preparing for licensure examinations.

## 🚀 Features

### Student Features
- **Schedule-Based Learning**: Pre-test → Discussion → Post-test progression
- **Real Question Bank**: 145+ questions from actual licensure exam materials
- **Adaptive Testing**: 30 questions for pre/post tests, 100 for mock exams
- **Progress Tracking**: Detailed analytics and performance insights
- **Study Recommendations**: AI-powered personalized study plans
- **Mobile Responsive**: Works on all devices

### Admin Features
- **User Management**: Manage students and cohorts
- **Question Bank**: Add, edit, and organize questions
- **Analytics Dashboard**: Track student performance and progress
- **Data Export**: CSV export for detailed reporting
- **Test Management**: Create and manage test schedules

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (local) / PostgreSQL (production)
- **Authentication**: NextAuth.js with email/password
- **UI Components**: Lucide React icons, custom components
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd MACALALAY-upd
   ```

2. **Install dependencies**
   ```bash
   cd web-app
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   ```

4. **Set up the database**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 👥 Default Accounts

### Admin Account
- **Email**: admin@reviewcenter.com
- **Password**: password123

### Student Account
- **Email**: student@reviewcenter.com
- **Password**: password123

## 📚 Project Structure

```
web-app/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── test/           # Test-taking interface
│   │   └── login/          # Authentication pages
│   ├── components/         # React components
│   ├── lib/               # Utility functions
│   └── styles/            # Global styles
├── prisma/                # Database schema and migrations
├── public/                # Static assets
└── scripts/              # Database seeding scripts
```

## 🎯 Key Features Explained

### Schedule-Based Learning
- Students follow a structured 18-week curriculum
- Sequential progression: Pre-test → Discussion → Post-test
- Access control ensures proper learning flow

### Question Management
- Questions filtered by lecture topics and subjects
- Automatic shuffling for post-tests
- Difficulty-based categorization

### Performance Analytics
- Subject-specific performance tracking
- Time-based analytics
- Progress visualization

## 🔧 Development

### Database Commands
```bash
# Reset database
npx prisma db push --force-reset

# Seed database
npx prisma db seed

# View database
npx prisma studio
```

### Adding New Questions
1. Add questions to `public/questions.json`
2. Run the import script: `npm run import-questions`

## 📊 Data Structure

### Test Attempts
- Tracks user progress through the curriculum
- Records scores, time spent, and subject performance
- Enforces sequential access control

### Question Bank
- 145+ questions across 4 subjects
- Categorized by difficulty and topic
- Supports multiple choice format

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- **Netlify**: Static export with API functions
- **Railway**: Full-stack deployment with PostgreSQL
- **DigitalOcean**: VPS deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact the development team

## 🎉 Acknowledgments

- Psychology licensure exam materials
- Next.js and Vercel for the amazing framework
- The open-source community for various libraries and tools

---

**Built with ❤️ for psychology students preparing for their licensure examinations.**
