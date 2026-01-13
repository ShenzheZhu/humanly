# Humory - Text Provenance Service

A comprehensive text provenance service that tracks user typing activities in external forms and surveys with real-time monitoring and analytics.

## 🎯 Features

- **Complete Authentication System** - Register, login, email verification, password reset
- **Project Management** - Create projects with unique tokens and tracking snippets
- **Event Tracking** - Capture every keystroke, paste, copy, and cursor movement
- **Real-time Live Preview** - WebSocket-based live event monitoring
- **Analytics Dashboard** - Statistics, timelines, event distributions, and user activity
- **Data Export** - Export events to JSON or CSV with filtering
- **Tracking Library** - Lightweight JavaScript library (<15KB) for embedding

## 📦 Project Structure

```
humory/
├── packages/
│   ├── shared/          # Shared TypeScript types and validators
│   ├── backend/         # Express.js API server with Socket.IO
│   ├── frontend/        # Next.js 14 web application
│   └── tracker/         # JavaScript tracking library
├── docker/              # Docker configurations
├── docker-compose.yml   # Local development environment
└── package.json         # Root workspace configuration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm 9+
- **Docker** and Docker Compose (for local development)
- **PostgreSQL** 14+ with TimescaleDB (or use Docker)
- **Redis** (or use Docker)

### Installation

1. **Clone the repository** (if not already done)
   ```bash
   cd /home/ubuntu/humory
   ```

2. **Install Node.js** (if not installed)
   ```bash
   # Using nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18

   # Or using package manager
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and set your values (especially JWT_SECRET)
   ```

5. **Start Docker services** (PostgreSQL + Redis)
   ```bash
   docker-compose up -d postgres redis
   ```

6. **Run database migrations**
   ```bash
   # Wait for PostgreSQL to be ready (check with docker-compose logs postgres)
   docker-compose exec postgres psql -U humory_user -d humory_dev -f /docker-entrypoint-initdb.d/001_initial_schema.sql
   ```

7. **Start the backend**
   ```bash
   npm run dev:backend
   ```

8. **Start the frontend** (in a new terminal)
   ```bash
   npm run dev:frontend
   ```

9. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Health: http://localhost:3001/health

## 🏗️ Development

### Running Individual Services

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend

# Tracker library (watch mode)
npm run dev:tracker

# All services
npm run dev:backend & npm run dev:frontend
```

### Building for Production

```bash
# Build all packages
npm run build:all

# Build individually
npm run build:backend
npm run build:frontend
npm run build:tracker
```

### Docker Development

```bash
# Start all services (including backend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild backend
docker-compose up -d --build backend
```

## 📚 API Documentation

### Base URL
- Development: `http://localhost:3001/api/v1`
- Production: `https://your-domain.com/api/v1`

**Important for Qualtrics Integration:** Qualtrics requires HTTPS for external scripts. See [HTTPS_SETUP.md](./HTTPS_SETUP.md) for configuration instructions.

### Authentication Endpoints (`/auth`)
- `POST /register` - Register new user
- `POST /verify-email` - Verify email with token
- `POST /login` - Login and get tokens
- `POST /logout` - Logout and invalidate tokens
- `POST /refresh` - Refresh access token
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `GET /me` - Get current user

### Project Endpoints (`/projects`)
- `GET /` - List projects (paginated)
- `POST /` - Create project
- `GET /:id` - Get project details
- `PUT /:id` - Update project
- `DELETE /:id` - Delete project
- `POST /:id/regenerate-token` - Regenerate project token
- `GET /:id/snippet` - Get tracking snippets

### Tracking Endpoints (`/track`)
- `POST /init` - Initialize tracking session
- `POST /events` - Batch event ingestion
- `POST /submit` - Submit session

### Analytics Endpoints (`/projects/:id/analytics`)
- `GET /summary` - Summary statistics
- `GET /events-timeline` - Events over time
- `GET /event-types` - Event type distribution
- `GET /users` - User activity list
- `GET /sessions/:sessionId` - Session details

### Export Endpoints (`/projects/:id/export`)
- `GET /json` - Export as JSON
- `GET /csv` - Export as CSV

For detailed API documentation with examples, see:
- `packages/backend/AUTH_IMPLEMENTATION.md`
- `packages/backend/ANALYTICS.md`
- `packages/backend/WEBSOCKET.md`

## 🔌 Using the Tracking Library

### Installation

Include the tracker script in your HTML:

```html
<script src="https://your-domain.com/tracker/humory-tracker.min.js"></script>
```

### Usage

```javascript
// Initialize tracker
const tracker = new HumoryTracker({
  projectToken: 'your-project-token-here',
  apiUrl: 'https://api.humory.com',
  userIdSelector: '#respondentId',  // CSS selector for user ID
  debug: false
});

// Start tracking all inputs
await tracker.init();

// Or track specific elements
tracker.attach('.survey-form input, .survey-form textarea');

// Mark session as submitted
await tracker.markSubmitted();

// Clean up
await tracker.destroy();
```

For complete documentation, see `packages/tracker/README.md`.

## 🐳 Production Deployment

### Backend Deployment (AWS)

1. **Set up AWS RDS PostgreSQL with TimescaleDB**
   ```bash
   # Create RDS instance
   # - Engine: PostgreSQL 14+
   # - Instance: db.t3.medium or larger
   # - Storage: gp3 with autoscaling
   # - Enable TimescaleDB extension after creation
   ```

2. **Deploy backend**
   ```bash
   # Build Docker image
   docker build -f docker/backend.Dockerfile -t humory-backend:latest .

   # Push to ECR/Docker Hub
   docker tag humory-backend:latest your-registry/humory-backend:latest
   docker push your-registry/humory-backend:latest

   # Deploy to EC2/ECS/EKS
   ```

3. **Configure environment variables**
   ```bash
   DATABASE_URL=postgresql://user:pass@your-rds-endpoint:5432/humory_prod
   REDIS_URL=redis://your-redis-endpoint:6379
   JWT_SECRET=your-secure-random-secret
   EMAIL_SERVICE=sendgrid
   EMAIL_API_KEY=your-sendgrid-key
   ```

### Frontend Deployment (Vercel)

1. **Connect to Vercel**
   ```bash
   cd packages/frontend
   vercel
   ```

2. **Configure environment variables** in Vercel dashboard:
   ```bash
   NEXT_PUBLIC_API_URL=https://api.your-domain.com
   NEXT_PUBLIC_WS_URL=wss://api.your-domain.com
   NEXT_PUBLIC_TRACKER_URL=https://api.your-domain.com/tracker/humory-tracker.min.js
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

## 🧪 Testing

```bash
# Backend tests
npm test --workspace=@humory/backend

# Frontend tests
npm test --workspace=@humory/frontend

# Tracker tests
npm test --workspace=@humory/tracker

# All tests
npm test
```

## 📊 Database Schema

The database uses PostgreSQL with TimescaleDB for efficient time-series data storage:

- **users** - User accounts with authentication
- **projects** - User projects with tracking tokens
- **sessions** - External user tracking sessions
- **events** - TimescaleDB hypertable for event data (auto-partitioned by day)
- **refresh_tokens** - JWT refresh tokens

For complete schema, see `packages/backend/src/db/migrations/001_initial_schema.sql`.

## 🔐 Security Features

- bcrypt password hashing (12 rounds)
- JWT access tokens (15 min) and refresh tokens (7 days)
- httpOnly cookies with secure and sameSite flags
- Rate limiting on all sensitive endpoints
- Email verification required
- CSRF protection via sameSite cookies
- SQL injection prevention via parameterized queries
- Project ownership verification

## 🎨 Technology Stack

### Backend
- Express.js - Web framework
- Socket.IO - Real-time WebSocket communication
- PostgreSQL + TimescaleDB - Time-series database
- Redis - Caching and rate limiting
- JWT - Authentication
- Nodemailer - Email service
- Zod - Schema validation

### Frontend
- Next.js 14 - React framework with App Router
- Tailwind CSS - Utility-first styling
- shadcn/ui - Component library
- Zustand - State management
- Axios - HTTP client
- Socket.IO Client - Real-time updates
- Recharts - Data visualization

### Tracker
- TypeScript - Type-safe JavaScript
- Rollup - Module bundler
- Terser - Code minification

## 📝 Environment Variables

### Backend (`packages/backend/.env`)
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://humory_user:humory_password@localhost:5432/humory_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=http://localhost:3000
EMAIL_SERVICE=console
EMAIL_FROM=noreply@humory.com
```

### Frontend (`packages/frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_TRACKER_URL=http://localhost:3001/tracker/humory-tracker.min.js
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U humory_user -d humory_dev -c "SELECT 1;"
```

### Redis Connection Issues
```bash
# Check if Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
```

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

## 📖 Additional Documentation

- **Authentication**: `packages/backend/AUTH_IMPLEMENTATION.md`
- **WebSocket**: `packages/backend/WEBSOCKET.md`
- **Analytics**: `packages/backend/ANALYTICS.md`
- **Tracker**: `packages/tracker/README.md`
- **Frontend Setup**: `packages/frontend/SETUP.md`

## 🤝 Contributing

This is a comprehensive full-stack application. Key areas for contribution:
- Additional analytics visualizations
- More export formats (Excel, Parquet)
- Enhanced tracking library features
- Performance optimizations
- Additional authentication methods (OAuth, 2FA)

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built with modern web technologies:
- TimescaleDB for efficient time-series data
- Socket.IO for real-time communication
- shadcn/ui for beautiful components
- Next.js for excellent developer experience

---

**Status**: ✅ Backend 100% Complete | ⏳ Frontend Foundation Ready

For questions or issues, please check the documentation in each package directory.
