# School Management System

A modern, full-featured school management system built with React, TypeScript, and Supabase.

## 🎯 Features

### For Administrators
- Create and manage teacher accounts
- Add and manage students and staff
- View comprehensive dashboard with statistics
- Update school settings and configuration
- Access all system features
- Generate and export reports

### For Teachers
- Mark student attendance (mobile-friendly)
- Enter exam scores and grades
- Generate student report cards
- View attendance reports
- Access on any device

### For Registrars
- Add and edit student records
- Manage staff information
- Export student data to Excel
- View student records

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd school-management-system
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up Supabase**
   - Create a Supabase project
   - Run `COMPLETE_DATABASE_SETUP.sql` in SQL Editor
   - Configure authentication settings (disable email confirmation)
   - Create your first admin user

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

5. **Run development server**
   ```bash
   pnpm dev
   ```

6. **Build for production**
   ```bash
   pnpm build
   ```

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[ADMIN_QUICK_START.md](ADMIN_QUICK_START.md)** - Quick reference for administrators
- **[READY_FOR_PRODUCTION.md](READY_FOR_PRODUCTION.md)** - Production readiness checklist
- **[CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md)** - Data cleanup details

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: TailwindCSS, Radix UI, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Authentication, RLS)
- **Routing**: React Router 6
- **Forms**: React Hook Form, Zod validation
- **PDF Generation**: jsPDF
- **Icons**: Lucide React

## 📱 Mobile Support

Fully responsive design optimized for:
- Desktop computers
- Tablets
- Mobile phones
- Touch-friendly interface

## 🔒 Security

- Role-based access control (Admin, Teacher, Registrar)
- Row Level Security (RLS) in database
- Secure authentication via Supabase
- Protected routes based on user roles
- Password requirements enforced

## 🎨 Features Highlights

### Attendance Management
- Daily student attendance tracking
- Staff attendance tracking (admin only)
- Attendance history and reports
- Mobile-optimized interface

### Academic Management
- Score entry for class work and exams
- Automatic grade calculation
- Report card generation (PDF)
- Batch report downloads

### Student Records
- Complete student profiles
- Parent/guardian information
- Class assignments
- Admission tracking

### Teacher Management
- Create teacher accounts
- Assign classes to teachers
- Manage teacher status
- Password reset functionality

## 📊 Dashboard

Real-time statistics:
- Total enrollment (boys/girls breakdown)
- Today's attendance rate
- Staff present count
- Recent activity log
- Alerts and notifications

## 🌐 Deployment

Deploy to:
- **Vercel** (recommended) - Free, automatic SSL
- **Netlify** - Free, automatic SSL
- **Your own server** - Full control

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📦 Project Structure

```
├── client/                 # React frontend
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utility functions
├── server/                # Express backend (optional)
├── shared/                # Shared types and utilities
├── dist/                 # Production build output
└── docs/                 # Documentation files
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Type checking
pnpm typecheck
```

## 🤝 Contributing

This is a production system for schools. Contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

[Your License Here]

## 🆘 Support

For issues or questions:
1. Check the documentation files
2. Review browser console for errors (F12)
3. Check Supabase logs
4. Open an issue on GitHub

## 🎓 Use Cases

Perfect for:
- Primary schools
- Junior high schools
- Senior high schools
- Private schools
- International schools
- Tutorial centers

## 💰 Cost

### Free Tier (Recommended for Start)
- Supabase: Free (500MB database)
- Vercel/Netlify: Free (100GB bandwidth)
- **Total: $0/month**

### Paid Tier (For Larger Schools)
- Supabase Pro: $25/month
- Vercel Pro: $20/month (optional)
- **Total: $25-45/month**

## 🌟 Key Benefits

- ✅ No installation required (web-based)
- ✅ Access from anywhere
- ✅ Mobile-friendly
- ✅ Automatic backups (Supabase)
- ✅ Secure and reliable
- ✅ Easy to use
- ✅ Professional reports
- ✅ Low cost

## 📈 Roadmap

Future enhancements:
- [ ] SMS notifications for parents
- [ ] Email notifications
- [ ] Fee management
- [ ] Timetable management
- [ ] Library management
- [ ] Transport management
- [ ] Multi-school support
- [ ] Mobile apps (iOS/Android)

## 🙏 Acknowledgments

Built with:
- React and the React ecosystem
- Supabase for backend infrastructure
- shadcn/ui for beautiful components
- TailwindCSS for styling

---

**Ready to deploy?** Start with [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)!

**Need help?** Check [ADMIN_QUICK_START.md](ADMIN_QUICK_START.md)!
