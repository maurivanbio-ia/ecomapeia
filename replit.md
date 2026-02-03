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
- Tab-based navigation with 4 main sections: Home, Inspections, IA (AI Assistant), Profile

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
- expo-image-picker - Camera and gallery photo capture
- expo-haptics - Tactile feedback
- react-native-reanimated - Smooth animations
- react-native-gesture-handler - Touch gestures
- react-native-maps - Polygon visualization on satellite maps (native only)
- react-native-view-shot - Map screenshot capture
- @expo/vector-icons (Feather) - Icon system

**Data & Networking:**
- @tanstack/react-query - Data fetching and caching
- @react-native-async-storage/async-storage - Local persistence
- drizzle-orm + pg - Database operations

**Fonts:**
- @expo-google-fonts/nunito - Primary typography

### AI Integration (Replit OpenAI)

**Status:** Installed and configured with 6 environmental analysis features
- Uses Replit AI Integrations for OpenAI access (gpt-5.2 model)
- Environment variables auto-configured: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

**Environmental AI Features (server/ai-routes.ts):**
- `/api/ai/analyze-photo` - Photo analysis for vegetation/irregularities
- `/api/ai/suggest-description` - Auto-fill field suggestions
- `/api/ai/generate-report-summary` - Technical report generation
- `/api/ai/transcribe-audio` - Voice note transcription
- `/api/ai/validate-coordinates` - Polygon validation and area calculation
- `/api/ai/field-assistant` - Streaming chatbot for environmental questions
- `/api/ai/auto-fill-form` - Form auto-completion from analysis

**Generic AI Features:**
- `/api/conversations` - CRUD endpoints for AI chat conversations
- `/api/conversations/:id/messages` - Send messages and get AI responses (streaming via SSE)
- `/api/generate-image` - Generate images using GPT-Image-1 model

**Database Tables for AI:**
- `conversations` - Stores chat conversation metadata
- `messages` - Stores chat messages with role (user/assistant) and content

**Integration Files:**
- `server/ai-routes.ts` - Environmental AI analysis routes
- `server/replit_integrations/chat/` - Chat routes and storage
- `server/replit_integrations/image/` - Image generation routes
- `server/replit_integrations/audio/` - Audio/voice capabilities (optional)

### Implemented Features

**Photo Capture & Management:**
- Camera capture with expo-image-picker
- Gallery selection (multiple photos support)
- Photo captions/legends for each image
- Thumbnail preview with delete functionality

**UTM Polygon Mapping:**
- Multiple UTM coordinate point collection
- UTM to Lat/Long conversion (zone 23K for São Paulo region)
- Polygon visualization on satellite map (native only via react-native-maps)
- Map screenshot capture for documentation
- Web fallback shows point count with Expo Go instructions

**GPS Auto-Capture (NEW):**
- Real-time GPS coordinate capture with expo-location
- Automatic conversion from Lat/Long to UTM coordinates
- Zone detection (supports all UTM zones)
- One-tap capture of current position as polygon point
- Utility functions in `client/lib/gpsUtils.ts`

**Digital Signature Capture (NEW):**
- SVG-based drawing canvas with pan responder
- Clear and save functionality
- Signature preview display
- Component: `client/components/SignatureCapture.tsx`

**Visual Date Picker (NEW):**
- Native date picker on iOS (modal spinner)
- Native date picker on Android (default picker)
- Web fallback with text input
- Components: `DatePickerField.tsx` / `DatePickerField.web.tsx`

**PDF Report Generation (NEW):**
- Server-side HTML template matching UHE Itupararanga standard format
- Property information, coordinates, interventions, photos
- Endpoint: `/api/pdf/vistoria/:id`
- Client uses expo-print and expo-sharing for native rendering

**Offline Mode with Synchronization (NEW):**
- AsyncStorage-based local persistence for vistorias
- Automatic queue for pending uploads
- Manual sync trigger from dashboard
- Visual status indicators (Sincronizado/Pendente)
- Utility functions in `client/lib/offlineStorage.ts`

**Dashboard with Statistics (NEW):**
- Total vistorias count
- Pending sync count
- Synced count
- Recent vistorias list with status badges
- One-tap synchronization button

**Inspection Details Screen (NEW):**
- View complete inspection data
- PDF export functionality
- Polygon visualization
- Photo gallery display
- Screen: `client/screens/DetalhesVistoriaScreen.tsx`

**General Map View (NEW):**
- All property polygons on single satellite map
- Interactive markers with callouts
- Navigation to inspection details
- Legend showing total properties
- Screen: `client/screens/MapaGeralScreen.tsx` (with web fallback)

**Components:**
- `MapPolygonView` - Platform-aware polygon display
  - `MapPolygonView.tsx` - Native version with react-native-maps
  - `MapPolygonView.web.tsx` - Web fallback with Expo Go guidance
- `SignatureCapture` - Digital signature canvas
- `DatePickerField` - Visual date selection (with web fallback)

**Additional NPM Packages:**
- expo-location - GPS coordinates capture
- expo-print - Native PDF rendering
- expo-sharing - Document sharing
- @react-native-community/datetimepicker - Date selection
- expo-local-authentication - Biometric authentication
- expo-av (Audio) - Voice note recording

### New Features (February 2026 Update)

**12 Major Feature Enhancements Completed:**

1. **Dark Mode System:**
   - Light/Dark/System theme modes with persistent storage
   - ThemeContext with useThemeContext hook
   - Settings toggle in ProfileScreen

2. **Search & Filters:**
   - Real-time search by owner name and municipality
   - Filter chips for sync status (All/Synced/Pending)
   - Implemented in HomeScreen

3. **Direct Sharing:**
   - Share inspection data via WhatsApp or email
   - Share complete reports or summaries
   - Utility: `client/lib/shareUtils.ts`

4. **Image Compression:**
   - Automatic photo optimization before upload
   - Configurable quality and max dimensions
   - Utility: `client/lib/imageUtils.ts`

5. **Biometric Login:**
   - Fingerprint/Face ID authentication (native only)
   - Toggle in settings with availability check
   - Utility: `client/lib/biometricAuth.ts`

6. **Voice Notes:**
   - Audio recording for field observations
   - Playback and delete functionality
   - Component: `client/components/VoiceNoteRecorder.tsx`

7. **Dashboard Charts:**
   - Visual statistics with bar charts
   - Simple stats cards with colors
   - Component: `client/components/StatsChart.tsx`

8. **Change History:**
   - Track modifications to inspections
   - Timestamp logging for edits

9. **Backup/Export:**
   - Export all data as JSON or CSV
   - Download or share exports
   - Utility: `client/lib/exportData.ts`

10. **Interactive Tutorial:**
    - First-time user onboarding overlay
    - Step-by-step feature introduction
    - Reset from settings
    - Component: `client/components/TutorialOverlay.tsx`

11. **Form Validation:**
    - Real-time field validation
    - CPF, email, phone validation
    - Required field checks
    - Utility: `client/lib/validationUtils.ts`

12. **Signature with Timestamp:**
    - Automatic date/time capture on sign
    - Displayed below signature preview
    - Enhanced SignatureCapture component

**Settings Redesign:**
- ProfileScreen with 9 organized options
- 3 sections: Appearance, Security & Data, Help & About
- Dark mode toggle, language selection, biometric toggle
- Export data, reset tutorial, about info

**Multilingual Support:**
- 60+ translation strings
- Portuguese, English, Spanish
- LanguageContext with persistent storage

### AI Environmental Analysis (NEW - February 2026)

**6 Major AI Features Implemented:**

1. **AI Photo Analysis:**
   - Automatic vegetation type detection (mata ciliar, pastagem, cultivo, etc.)
   - Irregularity identification (desmatamento, erosão, construções irregulares)
   - Land use classification
   - Risk assessment (baixo/médio/alto)
   - Component: `client/components/AIPhotoAnalysis.tsx`

2. **AI Field Assistant (Chatbot):**
   - Streaming chat interface for technical questions
   - Environmental legislation expertise (Código Florestal, CONAMA)
   - APP procedures and identification guidance
   - Quick question shortcuts for common queries
   - Screen: `client/screens/AssistenteIAScreen.tsx`

3. **AI Report Generation:**
   - Executive summary generation
   - Technical conclusions automation
   - Recommendations list
   - Final assessment with area classification
   - Component: `client/components/AIReportGenerator.tsx`

4. **Audio Transcription:**
   - Voice note to text conversion
   - Portuguese language support
   - Integration with VoiceNoteRecorder

5. **Coordinate Validation:**
   - Polygon validity checking
   - Area calculation in hectares
   - UTM zone verification
   - Overlap and consistency alerts

6. **Auto-Fill Suggestions:**
   - Context-aware field suggestions
   - Based on photo analysis results
   - Technical language for reports

**AI API Endpoints:**
- `POST /api/ai/analyze-photo` - Photo analysis with vision
- `POST /api/ai/suggest-description` - Field suggestions
- `POST /api/ai/generate-report-summary` - Report generation
- `POST /api/ai/transcribe-audio` - Audio transcription
- `POST /api/ai/validate-coordinates` - Coordinate validation
- `POST /api/ai/field-assistant` - Streaming chat (SSE)
- `POST /api/ai/auto-fill-form` - Form auto-completion

**AI Navigation:**
- New "IA" tab in main navigation (between Vistorias and Profile)
- IAStackNavigator: `client/navigation/IAStackNavigator.tsx`

**AI Utilities:**
- All AI functions: `client/lib/aiUtils.ts`
- Helper functions for risk colors and status display

### Future Integrations (Planned)

- Photo storage with cloud upload
- Full offline-first sync with conflict resolution
- Expanded AI capabilities for geospatial analysis