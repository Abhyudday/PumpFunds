# PumpFunds 🚀

A Solana-based memecoin fund investing platform with automated trade replication and SIP (Systematic Investment Plan) functionality. PumpFunds allows users to invest in professionally managed memecoin funds that automatically replicate top trader strategies on the Solana blockchain.

## 🌟 Features

### Core Platform
- **Memecoin Fund Investment**: Curated funds managed by professional traders
- **Automated Trade Replication**: Real-time copying of successful trader strategies
- **SIP & Lumpsum Investment**: Flexible investment options with recurring SIP support
- **Portfolio Management**: Comprehensive portfolio tracking and analytics
- **Solana Wallet Integration**: Support for Phantom, Backpack, and other Solana wallets

### User Experience
- **Modern Dark UI**: MEMEFI-inspired design patterns with TailwindCSS
- **Real-time Updates**: Live portfolio and fund performance tracking
- **Mobile Responsive**: Optimized for all devices
- **Seamless Authentication**: Email/password or wallet-only authentication

### Investment Features
- **Systematic Investment Plans (SIP)**: Automated recurring investments
- **Portfolio Analytics**: ROI tracking, allocation breakdown, performance metrics
- **Trade History**: Complete transaction and trade replication logs
- **Fund Performance**: Real-time fund statistics and trader performance

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Solana Web3.js** for blockchain integration
- **React Router** for navigation
- **React Hook Form** for form management
- **Recharts** for data visualization
- **Headless UI** for accessible components
- **Lucide React** for icons

### Backend
- **Node.js** with Express and TypeScript
- **PostgreSQL** database
- **JWT** authentication
- **bcryptjs** for password hashing
- **Solana Web3.js** for blockchain operations
- **node-cron** for SIP automation
- **Express Rate Limiting** for API protection

### Infrastructure
- **Docker** containerization
- **Railway** for deployment
- **PostgreSQL** database hosting

## 📁 Project Structure

```
PumpFund/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── FundCard.tsx
│   │   │   ├── InvestModal.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/          # Route components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Portfolio.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── App.tsx         # Main app component
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   │   ├── auth.ts     # Authentication routes
│   │   │   ├── funds.ts    # Fund management
│   │   │   ├── investments.ts # Investment operations
│   │   │   └── portfolio.ts   # Portfolio data
│   │   ├── middleware/     # Express middleware
│   │   │   └── auth.ts     # JWT authentication
│   │   ├── services/       # Business logic
│   │   │   └── scheduler.ts # SIP automation
│   │   ├── scripts/        # Database utilities
│   │   │   ├── migrate.ts  # Database migrations
│   │   │   └── seed.ts     # Sample data seeding
│   │   ├── models/         # Database models
│   │   ├── utils/          # Utility functions
│   │   └── index.ts        # Server entry point
│   ├── Dockerfile
│   ├── package.json
│   └── env.example
├── railway.json            # Railway deployment config
└── README.md
```

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd PumpFund
```

### 2. Server Setup

#### Install Dependencies
```bash
cd server
npm install
```

#### Environment Configuration
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/pumpfunds

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Solana
SOLANA_CLUSTER_URL=https://api.devnet.solana.com
SOLANA_COMMITMENT=confirmed

# Server
PORT=5000
NODE_ENV=development

# CORS
CLIENT_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Database Setup
```bash
# Create database
createdb pumpfunds

# Run migrations
npm run build
npm run db:migrate

# Seed sample data (optional)
npm run db:seed
```

#### Start Server
```bash
npm run dev
```
Server runs on `http://localhost:5000`

### 3. Client Setup

#### Install Dependencies
```bash
cd client
npm install
```

#### Start Development Server
```bash
npm run dev
```
Client runs on `http://localhost:3000`

## 🌐 Railway Deployment

### Automatic Deployment
1. **Fork/Clone** this repository
2. **Connect to Railway**: Import your GitHub repository
3. **Environment Variables**: Add the following in Railway dashboard:

```env
DATABASE_URL=<railway-provided-postgres-url>
JWT_SECRET=<generate-secure-random-string>
SOLANA_CLUSTER_URL=https://api.devnet.solana.com
SOLANA_COMMITMENT=confirmed
NODE_ENV=production
CLIENT_URL=<your-frontend-domain>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. **Deploy**: Railway will automatically build and deploy using the included `Dockerfile`
5. **Database Setup**: Run migrations in Railway terminal:
```bash
npm run db:migrate
npm run db:seed
```

### Manual Railway CLI Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Set environment variables
railway variables set DATABASE_URL=<postgres-url>
railway variables set JWT_SECRET=<your-secret>
# ... add other variables

# Deploy
railway up
```

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/register     # User registration
POST /api/auth/login        # Email/password login
POST /api/auth/wallet-login # Wallet-only authentication
GET  /api/auth/me          # Get current user
PUT  /api/auth/profile     # Update user profile
```

### Fund Management
```
GET    /api/funds          # List all funds
GET    /api/funds/:id      # Get fund details
POST   /api/funds          # Create fund (admin only)
PUT    /api/funds/:id      # Update fund (admin only)
DELETE /api/funds/:id      # Delete fund (admin only)
```

### Investment Operations
```
POST /api/investments              # Create SIP/Lumpsum investment
GET  /api/investments              # Get user investments
PUT  /api/investments/:id/pause    # Pause SIP
PUT  /api/investments/:id/resume   # Resume SIP
DELETE /api/investments/:id        # Cancel investment
```

### Portfolio Data
```
GET /api/portfolio/overview        # Portfolio metrics and stats
GET /api/portfolio/trades          # Trade history with pagination
GET /api/portfolio/performance     # Performance analytics
GET /api/portfolio/allocations     # Asset allocation breakdown
GET /api/portfolio/upcoming-sips   # Scheduled SIP payments
```

## 🗄 Database Schema

### Core Tables
- **users**: User authentication and profiles
- **funds**: Investment fund information and trader details
- **investments**: SIP and lumpsum investment records
- **trade_replications**: Automated trade execution logs

### Key Features
- Automatic Solana wallet generation for new users
- SIP automation with configurable frequencies
- Trade replication tracking and history
- Portfolio performance calculations

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `SOLANA_CLUSTER_URL` | Solana RPC endpoint | devnet |
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `CLIENT_URL` | Frontend URL for CORS | localhost:3000 |

### SIP Automation
- **Processing Frequency**: Every 5 minutes
- **Wallet Monitoring**: Every 2 minutes
- **Cleanup Jobs**: Daily at midnight
- **Mock Trade Generation**: Automatic for development

## 🎨 Design System

### MEMEFI Theme
- **Primary Colors**: Orange (#f97316) and Blue (#3b82f6)
- **Dark Theme**: Consistent dark backgrounds with high contrast
- **Typography**: Inter font family with proper weight hierarchy
- **Components**: Consistent spacing, borders, and hover effects

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly interface elements

## 🔒 Security Features

- JWT-based authentication with 7-day expiration
- bcrypt password hashing with salt rounds
- Express rate limiting (100 requests per 15 minutes)
- CORS configuration for secure cross-origin requests
- Input validation with express-validator
- Helmet.js for security headers

## 🧪 Development Tools

### Available Scripts

#### Client
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

#### Server
```bash
npm run dev      # Start with nodemon
npm run build    # Compile TypeScript
npm run start    # Start production server
npm run db:migrate # Run database migrations
npm run db:seed    # Seed sample data
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@pumpfunds.com or create an issue in the GitHub repository.

---

**Built with ❤️ for the Solana ecosystem** 