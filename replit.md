# EcoMapeIA - Replit Configuration

## Overview

EcoMapeIA is a professional mobile application designed for environmental technicians conducting field inspections in remote hydroelectric reservoir areas. Its primary purpose is to digitize and streamline the property inspection process along reservoir margins, replacing traditional paper-based methods with an offline-capable digital solution. Key capabilities include digital form completion, photo capture with automatic synchronization, coordinate-based polygon mapping for properties, and automated PDF report generation. The project aims to improve efficiency and data accuracy for environmental monitoring in areas with limited connectivity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The application is built with React Native and Expo SDK 54, utilizing a managed workflow with the new architecture enabled. It primarily targets Android tablets but also supports iOS and web platforms. Navigation is handled via file-based routing using React Navigation (native-stack + bottom-tabs). State management incorporates TanStack React Query for server state and caching, React Context for authentication, and AsyncStorage for local persistent user data. UI/UX features a custom theming system with light/dark mode, Reanimated for animations, and a modern aesthetic with blur effects. The interface is localized in Brazilian Portuguese. Key design decisions include path aliases for clean imports, keyboard-aware components, safe area layouts, and a tab-based navigation structure with Home, Inspections, AI Assistant, and Profile sections.

### Backend Architecture

The backend is an Express.js server developed in TypeScript, providing RESTful API endpoints under the `/api/` prefix. Authentication uses bcryptjs for password hashing and a session-based approach, with user data persisted locally on the client via AsyncStorage. Data persistence is managed by Drizzle ORM with a PostgreSQL dialect, defining a schema in `shared/schema.ts` with Zod integration. An in-memory storage (`MemStorage`) serves as a fallback. The database schema includes tables for users, inspections, coordinates, land use, and photos.

### Build & Development

The development workflow involves running both Expo and Express servers concurrently. Production builds are generated for both static web assets and the bundled server. Code quality is maintained with ESLint, Prettier, and strict TypeScript settings.

### AI Integration

The application integrates Replit AI, leveraging OpenAI's gpt-5.2 model for various environmental analysis features. This includes AI photo analysis for vegetation and irregularities, AI field assistant (chatbot) for technical questions, AI report generation, audio transcription, coordinate validation, and auto-fill suggestions. These features are exposed via dedicated API endpoints under `/api/ai/`. Chat conversations and messages are stored in separate database tables (`conversations`, `messages`).

### Core Features

-   **Photo Capture & Management:** Camera and gallery photo capture, multiple photo support, captions, thumbnail previews.
-   **UTM Polygon Mapping:** Collection and visualization of UTM coordinates, UTM to Lat/Long conversion, polygon visualization on satellite maps (native), and map screenshot capture.
-   **GPS Auto-Capture:** Real-time GPS coordinate capture with automatic Lat/Long to UTM conversion and zone detection.
-   **Digital Signature Capture:** SVG-based drawing canvas for signatures with timestamp.
-   **Visual Date Picker:** Platform-aware date selection.
-   **PDF Report Generation:** Server-side HTML template-based PDF generation matching industry standards.
-   **Offline Mode with Synchronization:** AsyncStorage for local persistence, automatic upload queue, and manual sync.
-   **Dashboard with Statistics:** Overview of inspections, sync status, and recent activity.
-   **Search & Filters:** Real-time search and filtering for inspections.
-   **Direct Sharing:** Share inspection data and reports.
-   **Image Compression:** Automatic photo optimization before upload.
-   **Biometric Login:** Fingerprint/Face ID authentication.
-   **Voice Notes:** Audio recording and playback for field observations.
-   **Settings Redesign:** Organized settings with appearance, security, and data options.
-   **Multilingual Support:** Translation for Portuguese, English, and Spanish.

## External Dependencies

### Core Services

-   **Database:** PostgreSQL (managed by Drizzle ORM).
-   **Environment Variables:** `DATABASE_URL`, `EXPO_PUBLIC_DOMAIN`, `REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `MAPBIOMAS_API_TOKEN`.

### Key NPM Packages

-   **Mobile/UI:** `expo-image`, `expo-image-picker`, `expo-haptics`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-maps`, `react-native-view-shot`, `@expo/vector-icons`, `expo-location`, `expo-print`, `expo-sharing`, `@react-native-community/datetimepicker`, `expo-local-authentication`, `expo-av`.
-   **Data & Networking:** `@tanstack/react-query`, `@react-native-async-storage/async-storage`, `drizzle-orm`, `pg`.
-   **Fonts:** `@expo-google-fonts/nunito`.

### AI Integration

-   **Replit AI Integrations:** Utilizes OpenAI for various AI functionalities (gpt-5.2 model).

### MapBiomas Alerta Integration

-   **MapBiomas Alerta API V2:** Integration for deforestation monitoring, providing access to alerts, rural properties (CAR), legal reserves (RL), and permanent protected areas (APPs).

### Terra Indígena Proximity (Mar 2026)

-   **Data source:** Shapefile FUNAI/IBGE (655 TIs, SIRGAS 2000), converted to `server/data/tis_brasil.json` with centroids
-   **New endpoint:** `POST /api/conservation/check-terra-indigena` — returns nearest TI name, ethnicity, municipality, UF, fase, and distance in km
-   **Risk levels:** HIGH (≤5 km), MEDIUM (≤25 km), LOW (>25 km) — color-coded card: red/yellow/green
-   **Integration flow:** GPS capture or manual UTM entry → automatic TI check (flag `ti: true`)
-   **Persistence:** `ti_info` JSONB column in `vistorias` table; restored in edit mode; included in PDF/DOCX reports
-   **Feature flag:** `ti` in `FeatureFlagsContext` (default `true`)

### Environmental Compliance Features

-   **Embargo Detection:** `/api/conservation/check-embargo` - Point-in-polygon verification against 968 loaded conservation units, returns risk level (HIGH/MEDIUM/LOW) and specific reasons for embargo
-   **AI Compliance Analysis:** `/api/ai/compliance-analysis` - Uses GPT-5.2 to analyze inspection data against Brazilian legislation (Lei 12.651/2012, Lei 9.985/2000, CONAMA), returns compliance score (0-100%), risks with legal foundation, non-conformities, and recommendations
-   **Automatic Flow:** GPS capture triggers: CAR lookup → UC proximity check → embargo detection → compliance analysis button availability
-   **Visual Alerts:** Color-coded cards (red=HIGH/CRITICAL, yellow=MEDIUM, green=LOW) appear after GPS capture showing embargo risk status
-   **Report Integration:** PDF and Word reports now include full environmental compliance data (CAR info, embargo risk analysis with color coding, AI compliance analysis with risk tables and recommendations)

### Database Schema Changes (Feb 2026)

-   **New JSONB columns in vistorias:** `car_info`, `embargo_check`, `compliance_analysis` store environmental compliance data
-   **Field naming convention:** Database uses snake_case (car_info), API transforms to camelCase (carInfo) for frontend/reports

### Admin User Management (Mar 2026)

-   **New endpoints in `server/routes/tenant.ts`:** `GET /api/tenant/admin/usuarios` (list all users with filters), `PUT /api/tenant/admin/usuarios/:id` (edit role/status), `DELETE /api/tenant/admin/usuarios/:id` (soft/hard delete)
-   **New endpoint in `server/routes/complexos.ts`:** `GET /api/complexos/all-uhes` (flat list of all UHEs across complexos, admin only)
-   **`GerenciarUsuariosScreen.tsx`:** Admin panel for user management with search, filter by role, edit modal (nome, email, role, status), and delete with confirmation; accessible from `AdminDashboardScreen` via "Gerenciar Usuários" button
-   **`AdminStackNavigator.tsx`:** Updated to include `GerenciarUsuarios` screen in the stack

### Vistorias no Mapa (Mar 2026)

-   **`MapaVistoriasScreen.tsx`:** Native map screen showing inspection markers filtered by status; clickable callouts open a detail modal with navigation to `DetalhesVistoria`; filter bar at top; accessible from `VistoriasScreen` quick actions
-   **`MapaVistoriasScreen.web.tsx`:** Web companion file — shows status summary cards and recent vistoria list (no native map); prevents Metro web bundling error from react-native-maps native-only modules
-   **`VistoriasStackNavigator.tsx`:** Registered `MapaVistoria` screen

### Coordinator Report Download (Mar 2026)

-   **Report endpoints:** `server/routes/reports.ts` provides 3 GET endpoints:
    -   `/api/reports/all` — full report with all complexos + UHEs
    -   `/api/reports/complexo/:complexoId` — report filtered to one complexo
    -   `/api/reports/uhe/:uheId` — report filtered to one UHE
-   **CBA Logo:** All reports embed the CBA logo (same as the individual vistoria notification PDF) via base64 from `server/assets/cba_logo.png`
-   **UI:** `AdminDashboardScreen` (coordinator and admin panel) now has:
    -   "Relatório Geral — Todos os Complexos" button above the complexo list
    -   "Relatório" download button on each complexo row
    -   Download icon on each UHE row inside expanded complexo
-   **Download flow:** On native, generates PDF via `expo-print` + `expo-sharing`; on web, opens HTML in new tab

### Multi-Tenant & Admin Features (Mar 2026)

-   **Multi-tenant architecture:** 4 Complexos (Juquiá, Sorocaba, Paranapanema, Salto do Rio Verdinho), empresa EcoBrasil (id:4)
-   **AdminStackNavigator:** Admin tab now uses a stack (AdminDashboard → GerenciarProjetos), enabling navigation between admin screens
-   **GerenciarProjetosScreen:** Manage projetos/UHEs organized by complexo; lists complexos with expandable UHE cards; create form with complexo selector, nome, código, reservatório, rio principal, municípios
-   **Automatic Sync:** `useAutoSync` hook monitors network connectivity via `@react-native-community/netinfo`; triggers sync automatically when connection transitions from offline → online (WiFi, 4G, 5G); implemented as global context (`AutoSyncContext`) to share state across screens
-   **SyncStatusBanner:** Fixed overlay banner (animated slide-in) showing sync status: syncing/success/error/offline; appears at top of screen and dismisses after 4-5 seconds
-   **Online/Offline indicator:** HomeScreen shows connection status badge (green Online / gray Offline) next to quick actions; sync button grays out when offline

### Advanced Features (Feb 2026)

-   **Weather Integration:** Real-time weather data via Open-Meteo API (free, no key required) displayed during inspections
-   **APP Calculator:** Automatic APP width calculation per Lei 12.651/2012 based on water body dimensions
-   **Satellite Comparison:** INPE DETER integration for temporal satellite imagery comparison
-   **Document Scanner:** OCR capability using OpenAI Vision for document digitization
-   **Video Recording:** 60-second video capture with expo-camera for field documentation
-   **Team Management:** Equipes screen with team creation, member assignment, and vistoria delegation
-   **Notifications:** In-app notification system for vistoria updates and team assignments
-   **Analytics Dashboard:** Visual analytics with charts (pie/bar), export to CSV/Excel
-   **Property History:** Track and search vistorias by property with historical data
-   **Navigation Updates:** Quick action buttons on VistoriasScreen for Dashboard, Equipes, and Histórico
-   **GPS Trajectory Tracking:** Continuous location monitoring during inspections with useGPSTracking hook (5-second/5-meter intervals), tracks distance traveled, elapsed time, and stores full trajectory path
-   **Multiple Trajectory Support:** Save multiple GPS trajectories per inspection with custom legends (e.g., "APP Area", "Deforestation Zone", "North Boundary"). Each trajectory has unique color, distance, and duration tracking.
-   **KMZ/KML Export:** Export property polygon and all trajectories with legends for Google Earth visualization via `/api/kmz/export/:vistoriaId`

### Database Fields for GPS Tracking

-   **track_points JSONB:** Stores array of trajectory objects, each containing: legenda (legend/label), color (hex), distance (meters), duration (seconds), points[] with lat, lon, alt, acc, ts

### New API Endpoints

-   `/api/features/weather` - Real-time weather data by coordinates
-   `/api/features/app-calculator` - APP width calculation
-   `/api/features/satellite-comparison` - INPE satellite imagery
-   `/api/features/document-ocr` - Document text extraction
-   `/api/features/export/:format` - CSV/Excel export
-   `/api/team/*` - Team management (create, list, members, assign vistorias)
-   `/api/notifications/*` - Notification CRUD and status updates