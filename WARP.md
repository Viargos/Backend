# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Viargos Backend is a NestJS-based REST API and WebSocket server for a travel journaling and social media platform. The application features user authentication, journey planning with location tracking, social posts with media, real-time chat, and user relationship management.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Development server with hot reload
npm run start:dev

# Production build
npm run build

# Start production server
npm run start:prod

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Generate test coverage
npm run test:cov

# Lint and fix code
npm run lint

# Format code
npm run format
```

### Database Commands
```bash
# Generate new migration
npm run migration:generate src/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Direct TypeORM commands
npm run typeorm -- --help
```

### Testing Individual Components
```bash
# Test specific module
npm test -- user.service.spec.ts

# Test specific file with watch
npm run test:watch -- user.controller.spec.ts

# Debug specific test
npm run test:debug -- user.service.spec.ts
```

## Architecture Overview

### Core Structure
- **NestJS Framework**: Progressive Node.js framework with decorators and dependency injection
- **TypeORM**: PostgreSQL database with entity-based ORM
- **JWT Authentication**: Passport-based auth with refresh tokens
- **WebSockets**: Real-time chat using Socket.io gateway
- **Email Service**: Mailer integration with template support
- **File Upload**: AWS S3 and local storage services
- **Logging**: Winston with daily rotation
- **API Documentation**: Swagger/OpenAPI integration

### Module Organization
```
src/
├── config/           # Configuration modules (database, server, auth)
├── core/            # Global interceptors, guards, decorators
├── modules/         # Feature modules
│   ├── auth/        # Authentication & authorization
│   ├── user/        # User management & relationships
│   ├── journey/     # Travel journey planning with locations
│   ├── post/        # Social posts with media & comments
│   └── chat/        # Real-time messaging
├── setup/           # Infrastructure (database, websockets, logging)
├── migrations/      # Database schema migrations
└── utils/           # Shared utilities and helpers
```

### Key Entities and Relationships
- **User**: Core entity with profiles, relationships, authentication
- **Journey**: Travel plans with multiple days and location-based places
- **JourneyDay**: Daily itineraries within journeys
- **JourneyDayPlace**: Specific locations/activities with coordinates and timing
- **Post**: Social media posts with media, likes, and comments
- **ChatMessage**: Real-time messaging between users
- **UserOtp**: OTP management for email verification and password reset

### Authentication Flow
1. User registration with email/phone validation
2. OTP-based email verification (account activation)
3. JWT-based session management with guards
4. Password reset via OTP verification
5. WebSocket authentication for real-time features

### Location and Journey System
- Journeys contain multiple days with detailed itineraries
- Places are categorized (TRANSPORT, STAY, FOOD, ACTIVITY)
- Each place includes coordinates (latitude/longitude) and timing
- Example data structure available in `examples/journey-with-location-example.json`

### Real-time Features
- WebSocket gateway at `/chat` namespace
- User connection management with authentication
- Message sending, delivery, and read receipts
- Unread message counting

## Environment Configuration

Required environment variables:
```bash
# Database
DB_HOST=your-database-host
DB_PORT=5432
DB_USER=your-username
DB_PWD=your-password
DB_NAME=your-database-name

# JWT & Security
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Email (for OTP)
EMAIL_USER=your-email
EMAIL_PASS=your-email-password

# AWS S3 (optional)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=your-region
AWS_S3_BUCKET=your-bucket

# Server
PORT=3000
NODE_ENV=development
```

## Development Patterns

### Entity Creation
- Use decorators for TypeORM relationships and constraints
- Include `CreatedDateColumn` and `UpdateDateColumn` for audit trails
- Use UUID primary keys (`PrimaryGeneratedColumn('uuid')`)
- Add proper indexes for frequently queried fields

### DTO Validation
- Use `class-validator` decorators in DTOs
- Implement transformation with `class-transformer`
- Global validation pipe configured with whitelist and transform

### Service Layer
- Repository pattern with custom repositories
- Transaction support for complex operations
- Proper error handling with HTTP exceptions
- Logging integration for debugging

### Testing
- Unit tests for services and controllers
- E2E tests for API endpoints
- Mocking external dependencies
- Path mapping configured for clean imports (`@utils/*`)

## API Documentation

- Swagger UI available at `/api-docs` when running
- JWT Bearer token authentication configured
- JSON schema available at `/swagger.json`

## File Upload System

- Local storage service for development
- AWS S3 integration for production
- Static file serving from `/uploads/` endpoint
- Image upload support for profiles and post media

## Common Development Tasks

### Adding New Entity
1. Create entity file with TypeORM decorators
2. Generate migration: `npm run migration:generate src/migrations/AddEntityName`
3. Run migration: `npm run migration:run`
4. Create corresponding DTOs, repository, service, controller
5. Update module imports

### Adding New API Endpoint
1. Create/update DTOs with validation
2. Add method to service layer
3. Create controller endpoint with Swagger decorators
4. Add guards for authentication if needed
5. Write unit and E2E tests

### WebSocket Event Handling
1. Add message handler in `ChatGateway`
2. Use `@SubscribeMessage()` decorator
3. Implement proper authentication with `WsJwtAuthGuard`
4. Handle user connections and disconnections
5. Emit responses to appropriate clients

## Common Gotchas

- Database connection uses SSL with `rejectUnauthorized: false`
- OTP emails may be disabled in development (check logs)
- File uploads create `uploads/` directory automatically
- TypeORM entities must be in `dist/` for migrations
- WebSocket connections require token in handshake auth
- Path mapping requires both tsconfig.json and jest.config.ts updates
