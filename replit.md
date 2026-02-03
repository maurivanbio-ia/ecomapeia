# MapeIA (GeoCadastra) - Replit Configuration

## Overview

MapeIA (GeoCadastra) is a professional mobile application designed for environmental technicians conducting field inspections in remote hydroelectric reservoir areas. Its primary purpose is to digitize and streamline the property inspection process along reservoir margins, replacing traditional paper-based methods with an offline-capable digital solution. Key capabilities include digital form completion, photo capture with automatic synchronization, coordinate-based polygon mapping for properties, and automated PDF report generation. The project aims to improve efficiency and data accuracy for environmental monitoring in areas with limited connectivity.

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

### Environmental Compliance Features

-   **Embargo Detection:** `/api/conservation/check-embargo` - Point-in-polygon verification against 968 loaded conservation units, returns risk level (HIGH/MEDIUM/LOW) and specific reasons for embargo
-   **AI Compliance Analysis:** `/api/ai/compliance-analysis` - Uses GPT-5.2 to analyze inspection data against Brazilian legislation (Lei 12.651/2012, Lei 9.985/2000, CONAMA), returns compliance score (0-100%), risks with legal foundation, non-conformities, and recommendations
-   **Automatic Flow:** GPS capture triggers: CAR lookup → UC proximity check → embargo detection → compliance analysis button availability
-   **Visual Alerts:** Color-coded cards (red=HIGH/CRITICAL, yellow=MEDIUM, green=LOW) appear after GPS capture showing embargo risk status