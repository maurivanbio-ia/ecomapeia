# MapeIA (GeoCadastra) - Replit Configuration

## Overview

MapeIA (GeoCadastra) is a professional field inspection mobile application for environmental technicians working in remote hydroelectric reservoir areas. The app replaces manual paper forms with a digital, offline-capable solution for property inspections along reservoir margins.

**Core Purpose:**
- Digital field inspection forms with offline capability
- Photo capture with automatic upload sync
- Coordinate-based polygon mapping for properties
- Automated PDF report generation matching existing layout standards
- Data synchronization when connectivity is restored

**Target Users:** Environmental technicians and field inspectors working in remote areas with limited internet connectivity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React Native with Expo SDK 54
- Uses Expo managed workflow with new architecture enabled
- Targets Android tablets primarily, with iOS and web support
- File-based routing through React Navigation (native-stack + bottom-tabs)

**State Management:**
- TanStack React Query for server state and caching
- React Context for authentication state (`useAuth` hook)
- AsyncStorage for persistent local user data

**UI/UX Approach:**
- Custom theming system with light/dark mode support (`client/constants/theme.ts`)
- Reanimated-powered animations for smooth interactions
- Blur effects and glass-style UI elements for modern aesthetic
- Portuguese language interface (Brazilian Portuguese)

**Key Design Decisions:**
- Path aliases (`@/` for client, `@shared/` for shared code) for clean imports
- Keyboard-aware components with platform-specific handling
- Safe area aware layouts for proper insets on all devices
- Tab-based navigation with 3 main sections: Home, Inspections, Profile

### Backend Architecture

**Server:** Express.js with TypeScript
- RESTful API endpoints under `/api/` prefix
- CORS configured for Replit domains and localhost development
- Static file serving for production web builds

**Authentication:**
- Password hashing with bcryptjs
- Session-based auth with user data stored in AsyncStorage on client
- Login/register endpoints with Zod validation

**Data Layer:**
- Drizzle ORM with PostgreSQL dialect
- Schema defined in `shared/schema.ts` with Zod integration via drizzle-zod
- Current implementation uses in-memory storage (`MemStorage`) as fallback
- Database migrations in `/migrations` directory

**Database Schema:**
- `usuarios` - User accounts with email/password auth
- `vistorias` - Field inspections with property data
- `coordenadas` - GPS coordinates for polygon mapping
- `usos_solo` - Land use classifications
- `fotos` - Photo metadata with captions

### Build & Development

**Development Workflow:**
- `npm run expo:dev` - Start Expo development server
- `npm run server:dev` - Start Express API server with tsx
- Both must run simultaneously for full functionality

**Production Build:**
- `npm run expo:static:build` - Build static web assets
- `npm run server:build` - Bundle server with esbuild
- `npm run server:prod` - Run production server

**Code Quality:**
- ESLint with Expo config and Prettier integration
- TypeScript strict mode enabled
- Type checking via `npm run check:types`

## External Dependencies

### Core Services

**Database:** PostgreSQL
- Required for production (DATABASE_URL environment variable)
- Drizzle ORM handles schema and queries
- Run `npm run db:push` to sync schema

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (required for database)
- `EXPO_PUBLIC_DOMAIN` - API server domain for client requests
- `REPLIT_DEV_DOMAIN` - Auto-set by Replit for development
- `REPLIT_DOMAINS` - Auto-set by Replit for CORS configuration

### Key NPM Packages

**Mobile/UI:**
- expo-image - Optimized image loading
- expo-haptics - Tactile feedback
- react-native-reanimated - Smooth animations
- react-native-gesture-handler - Touch gestures
- @expo/vector-icons (Feather) - Icon system

**Data & Networking:**
- @tanstack/react-query - Data fetching and caching
- @react-native-async-storage/async-storage - Local persistence
- drizzle-orm + pg - Database operations

**Fonts:**
- @expo-google-fonts/nunito - Primary typography

### AI Integration (Replit OpenAI)

**Status:** Installed and configured
- Uses Replit AI Integrations for OpenAI access
- Environment variables auto-configured: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

**AI Features Available:**
- `/api/conversations` - CRUD endpoints for AI chat conversations
- `/api/conversations/:id/messages` - Send messages and get AI responses (streaming via SSE)
- `/api/generate-image` - Generate images using GPT-Image-1 model

**Database Tables for AI:**
- `conversations` - Stores chat conversation metadata
- `messages` - Stores chat messages with role (user/assistant) and content

**Integration Files:**
- `server/replit_integrations/chat/` - Chat routes and storage
- `server/replit_integrations/image/` - Image generation routes
- `server/replit_integrations/audio/` - Audio/voice capabilities (optional)

### Future Integrations (Planned per design docs)

- Map/polygon generation from coordinates
- PDF report generation matching existing templates
- Photo storage with cloud upload
- Offline-first data sync system
- AI-powered inspection suggestions and analysis