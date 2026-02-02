# GeoCadastra - Design Guidelines

## 1. Brand Identity

**Purpose**: GeoCadastra is a professional field inspection tool for environmental technicians working in remote hydroelectric reservoir areas. It replaces manual forms with offline-capable digital workflows.

**Aesthetic Direction**: Professional/Technical with Natural Elements
- Clean, efficient interface optimized for tablet use in field conditions
- Earthy color palette reflecting environmental/water themes
- High contrast for outdoor readability
- Spacious touch targets for field use with gloves

**Memorable Element**: The hydroelectric dam river imagery on login creates immediate context and brand association with water/environmental management.

## 2. Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs with floating action button)

**Tabs**:
1. **Início** (Home) - Dashboard with recent inspections
2. **Vistorias** (Inspections) - List of all inspections with search
3. **Sincronizar** (Sync) - FAB for new inspection + sync status
4. **Perfil** (Profile) - User account and settings

**Auth Flow**: Stack-based (Login → Home with tabs)

## 3. Screen-by-Screen Specifications

### Login Screen
- **Layout**: 
  - Full-screen background image (hydroelectric dam river photo)
  - Semi-transparent dark overlay (rgba(0,0,0,0.4)) for contrast
  - Logo centered vertically and horizontally
  - Login form positioned above logo (top third of screen)
  - No header
- **Components**:
  - Email text input (white with subtle border)
  - Password text input (white with subtle border, show/hide toggle)
  - "Faça seu login" primary button
  - "Esqueci minha senha" text link below button
- **Safe Area**: Top inset.top + 32px, Bottom inset.bottom + 32px

### Home Screen (Início)
- **Header**: Transparent, title "Início", right button: notifications bell icon
- **Layout**: ScrollView with card-based content
- **Safe Area**: Top headerHeight + 24px, Bottom tabBarHeight + 24px
- **Components**:
  - Welcome card with user name and inspection count
  - "Vistorias Recentes" section with 3 most recent inspection cards (thumbnail, property name, date, sync status badge)
  - "Ações Rápidas" section with icon buttons (Nova Vistoria, Sincronizar Pendentes)
- **Empty State**: "Nenhuma vistoria cadastrada" with illustration (empty-inspections.png)

### Inspections List Screen (Vistorias)
- **Header**: Default white background, title "Vistorias", right button: filter icon, search bar below title
- **Layout**: FlatList with pull-to-refresh
- **Safe Area**: Top 0 (standard header), Bottom tabBarHeight + 24px
- **Components**:
  - Each list item: Property name (bold), date, sync status badge (green "Sincronizado" / orange "Pendente"), chevron right
  - Filter modal: Status (all/synced/pending), Date range picker
- **Empty State**: Search icon illustration with "Nenhuma vistoria encontrada"

### New Inspection Screen (Modal Stack)
- **Navigation**: Full-screen modal opened via FAB
- **Header**: White, left button: "Cancelar", title "Nova Vistoria", right button: "Salvar"
- **Layout**: Multi-step form with progress indicator (5 steps)
  - Step 1: Dados da Propriedade (property name, date picker, observations textarea)
  - Step 2: Coordenadas (latitude/longitude inputs, map preview, add multiple points button)
  - Step 3: Uso do Solo (checkboxes with area inputs: Agricultura, Pecuária, Vegetação Nativa, Outro)
  - Step 4: Fotos (grid upload 2 columns, tap to add photo, caption field below each, max 16 photos)
  - Step 5: Croqui (upload image button or draw sketch button)
- **Bottom Navigation**: "Anterior" and "Próximo" buttons (hide Anterior on step 1, show "Salvar" on step 5)
- **Safe Area**: Top headerHeight + 16px, Bottom insets.bottom + 80px (for bottom buttons)

### Inspection Detail Screen
- **Header**: White, left button: back arrow, title: property name, right button: share icon
- **Layout**: ScrollView with sections
- **Safe Area**: Top 0, Bottom tabBarHeight + 24px
- **Components**:
  - Status badge (synced/pending)
  - Info cards: Date, Coordinates, Land Use breakdown
  - Photos grid (2 columns) with captions
  - Map with polygon
  - "Gerar PDF" primary button
  - "Editar" secondary button
  - "Excluir Vistoria" danger text link (bottom)

### Profile Screen (Perfil)
- **Header**: Transparent, title "Perfil"
- **Layout**: ScrollView
- **Safe Area**: Top headerHeight + 24px, Bottom tabBarHeight + 24px
- **Components**:
  - User avatar (circular, 80px) with name and user type below
  - Settings list items: Notificações (toggle), Tema (system/light/dark), Idioma (PT/EN)
  - "Sobre o App" list item
  - "Sair" button (requires confirmation alert)
  - "Excluir Conta" danger link (nested: Settings → Account → Delete with double confirmation)

## 4. Color Palette

**Primary Colors** (matching hydroelectric/environmental theme):
- Primary: `#0077BE` (Deep water blue)
- Primary Dark: `#005A8C`
- Primary Light: `#4DA3D6`

**Background & Surface**:
- Background: `#F5F5F5` (Light gray)
- Surface: `#FFFFFF`
- Surface Elevated: `#FFFFFF` with shadow

**Text**:
- Primary Text: `#1A1A1A`
- Secondary Text: `#666666`
- Disabled Text: `#999999`
- On Primary: `#FFFFFF`

**Semantic**:
- Success/Synced: `#2E7D32` (Green)
- Warning/Pending: `#F57C00` (Orange)
- Error: `#C62828` (Red)
- Info: `#1976D2` (Blue)

## 5. Typography

**Font**: Roboto (Material Design standard for Android tablets)

**Type Scale**:
- H1: 32px, Bold (Screen titles)
- H2: 24px, Bold (Section headers)
- H3: 18px, SemiBold (Card titles)
- Body: 16px, Regular (Main content)
- Caption: 14px, Regular (Secondary info, labels)
- Button: 16px, Bold, Uppercase

## 6. Visual Design

**Icons**: Material Icons (standard Android icon set)
**Touch Targets**: Minimum 48x48px for field usability
**Borders**: 1px solid with colors.border (`#E0E0E0`)
**Border Radius**: 8px for cards/buttons, 4px for inputs
**Floating Action Button Shadow**: 
- shadowOffset: {width: 0, height: 4}
- shadowOpacity: 0.15
- shadowRadius: 8

**Interactive States**:
- Buttons: Scale to 0.95 on press, opacity 0.8
- List items: Background to `#F5F5F5` on press
- Input focus: Border color changes to Primary

## 7. Assets to Generate

1. **icon.png** - App icon with GeoCadastra logo on blue gradient background
   - WHERE USED: Device home screen

2. **splash-icon.png** - GeoCadastra logo for splash screen
   - WHERE USED: App launch

3. **login-background.jpg** - Hydroelectric dam with river flowing (landscape orientation)
   - WHERE USED: Login screen full background

4. **empty-inspections.png** - Minimalist illustration of clipboard with checkmarks
   - WHERE USED: Home screen when no inspections exist

5. **empty-search.png** - Magnifying glass with document icon
   - WHERE USED: Inspections list when search returns no results

6. **user-avatar-default.png** - Circular avatar with initials placeholder
   - WHERE USED: Profile screen default avatar