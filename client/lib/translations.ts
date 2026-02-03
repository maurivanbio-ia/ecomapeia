export type Language = "Português" | "English" | "Español";

export interface Translations {
  // Profile Screen
  settings: string;
  notifications: string;
  language: string;
  aboutApp: string;
  logout: string;
  logoutConfirmTitle: string;
  logoutConfirmMessage: string;
  cancel: string;
  exit: string;
  version: string;
  
  // About Modal
  selectLanguage: string;
  close: string;
  aboutTheApp: string;
  appDescription1: string;
  appDescription2: string;
  features: string;
  featureOffline: string;
  featurePhotos: string;
  featurePolygon: string;
  featureGPS: string;
  featureReports: string;
  developedBy: string;
  by: string;
  
  // Notifications
  notificationsTitle: string;
  notificationsWebMessage: string;
  notificationsEnabled: string;
  notificationsDisabled: string;
  notificationsSettings: string;
  openSettings: string;
  error: string;
  errorOpenSettings: string;
  
  // Home Screen
  welcome: string;
  totalInspections: string;
  pending: string;
  synced: string;
  syncNow: string;
  recentInspections: string;
  noInspections: string;
  
  // Navigation
  home: string;
  inspections: string;
  profile: string;
  newInspection: string;
  
  // New Settings
  darkMode: string;
  biometricLogin: string;
  backupData: string;
  shareApp: string;
  resetTutorial: string;
  
  // Dark Mode Options
  lightMode: string;
  darkModeOption: string;
  systemMode: string;
  selectTheme: string;
  
  // Biometric
  biometricTitle: string;
  biometricEnabled: string;
  biometricDisabled: string;
  biometricNotAvailable: string;
  biometricEnablePrompt: string;
  biometricDisablePrompt: string;
  enableBiometric: string;
  disableBiometric: string;
  
  // Backup
  backupTitle: string;
  backupDescription: string;
  exportJSON: string;
  exportCSV: string;
  backupSuccess: string;
  backupError: string;
  
  // Share
  shareTitle: string;
  shareViaWhatsApp: string;
  shareViaEmail: string;
  shareOther: string;
  shareMessage: string;
  
  // Tutorial
  tutorialReset: string;
  tutorialResetSuccess: string;
  
  // Search
  search: string;
  searchPlaceholder: string;
  noResults: string;
  filterByDate: string;
  filterByStatus: string;
  all: string;
  
  // Validation
  requiredField: string;
  invalidEmail: string;
  invalidPhone: string;
  
  // Voice Notes
  voiceNote: string;
  startRecording: string;
  stopRecording: string;
  playRecording: string;
  deleteRecording: string;
  
  // Charts
  statistics: string;
  monthlyChart: string;
  statusChart: string;
  
  // History
  changeHistory: string;
  lastModified: string;
  modifiedBy: string;
  
  // General
  save: string;
  delete: string;
  confirm: string;
  success: string;
  loading: string;
}

const translations: Record<Language, Translations> = {
  "Português": {
    settings: "Configurações",
    notifications: "Notificações",
    language: "Idioma",
    aboutApp: "Sobre o App",
    logout: "Sair da conta",
    logoutConfirmTitle: "Sair da conta",
    logoutConfirmMessage: "Tem certeza que deseja sair?",
    cancel: "Cancelar",
    exit: "Sair",
    version: "Versão",
    
    selectLanguage: "Selecione o Idioma",
    close: "Fechar",
    aboutTheApp: "Sobre o Aplicativo",
    appDescription1: "O MapeIA é uma plataforma profissional de vistorias ambientais desenvolvida para técnicos de campo que trabalham em áreas remotas de reservatórios hidrelétricos.",
    appDescription2: "O aplicativo substitui formulários de papel por uma solução digital com capacidade offline, captura de fotos, mapeamento de polígonos por coordenadas UTM e geração automatizada de relatórios em PDF e Word.",
    features: "Funcionalidades",
    featureOffline: "Modo offline com sincronização",
    featurePhotos: "Captura de fotos com legendas",
    featurePolygon: "Mapeamento de polígonos UTM",
    featureGPS: "Captura automática de GPS",
    featureReports: "Geração de relatórios PDF e Word",
    developedBy: "Desenvolvido pela",
    by: "por",
    
    notificationsTitle: "Notificações",
    notificationsWebMessage: "Para gerenciar notificações no navegador, acesse as configurações do seu navegador.",
    notificationsEnabled: "Notificações estão ativadas",
    notificationsDisabled: "Notificações estão desativadas",
    notificationsSettings: "Configurações de Notificações",
    openSettings: "Abrir Configurações",
    error: "Erro",
    errorOpenSettings: "Não foi possível abrir as configurações do dispositivo.",
    
    welcome: "Bem-vindo",
    totalInspections: "Total de Vistorias",
    pending: "Pendentes",
    synced: "Sincronizadas",
    syncNow: "Sincronizar Agora",
    recentInspections: "Vistorias Recentes",
    noInspections: "Nenhuma vistoria registrada",
    
    home: "Início",
    inspections: "Vistorias",
    profile: "Perfil",
    newInspection: "Nova Vistoria",
    
    // New Settings
    darkMode: "Tema",
    biometricLogin: "Login Biométrico",
    backupData: "Backup dos Dados",
    shareApp: "Compartilhar App",
    resetTutorial: "Rever Tutorial",
    
    // Dark Mode Options
    lightMode: "Claro",
    darkModeOption: "Escuro",
    systemMode: "Automático",
    selectTheme: "Selecione o Tema",
    
    // Biometric
    biometricTitle: "Login Biométrico",
    biometricEnabled: "Login biométrico está ativado. Use sua impressão digital ou Face ID para acessar o app rapidamente.",
    biometricDisabled: "Ative o login biométrico para acessar o app de forma mais rápida e segura.",
    biometricNotAvailable: "Seu dispositivo não suporta autenticação biométrica ou não há biometria cadastrada.",
    biometricEnablePrompt: "Autentique-se para ativar o login biométrico",
    biometricDisablePrompt: "Autentique-se para desativar o login biométrico",
    enableBiometric: "Ativar Biometria",
    disableBiometric: "Desativar Biometria",
    
    // Backup
    backupTitle: "Backup dos Dados",
    backupDescription: "Exporte suas vistorias para manter uma cópia de segurança dos seus dados.",
    exportJSON: "Exportar JSON",
    exportCSV: "Exportar CSV",
    backupSuccess: "Backup exportado com sucesso!",
    backupError: "Erro ao exportar backup",
    
    // Share
    shareTitle: "Compartilhar",
    shareViaWhatsApp: "WhatsApp",
    shareViaEmail: "E-mail",
    shareOther: "Outros",
    shareMessage: "Conheça o MapeIA - a plataforma de vistorias ambientais! Baixe agora:",
    
    // Tutorial
    tutorialReset: "Tutorial redefinido!",
    tutorialResetSuccess: "O tutorial será exibido novamente na próxima vez que você abrir o app.",
    
    // Search
    search: "Buscar",
    searchPlaceholder: "Buscar por proprietário, município...",
    noResults: "Nenhum resultado encontrado",
    filterByDate: "Filtrar por data",
    filterByStatus: "Filtrar por status",
    all: "Todos",
    
    // Validation
    requiredField: "Este campo é obrigatório",
    invalidEmail: "E-mail inválido",
    invalidPhone: "Telefone inválido",
    
    // Voice Notes
    voiceNote: "Nota de Voz",
    startRecording: "Iniciar Gravação",
    stopRecording: "Parar Gravação",
    playRecording: "Reproduzir",
    deleteRecording: "Excluir Gravação",
    
    // Charts
    statistics: "Estatísticas",
    monthlyChart: "Vistorias por Mês",
    statusChart: "Status das Vistorias",
    
    // History
    changeHistory: "Histórico de Alterações",
    lastModified: "Última modificação",
    modifiedBy: "Modificado por",
    
    // General
    save: "Salvar",
    delete: "Excluir",
    confirm: "Confirmar",
    success: "Sucesso",
    loading: "Carregando...",
  },
  
  "English": {
    settings: "Settings",
    notifications: "Notifications",
    language: "Language",
    aboutApp: "About the App",
    logout: "Log out",
    logoutConfirmTitle: "Log out",
    logoutConfirmMessage: "Are you sure you want to log out?",
    cancel: "Cancel",
    exit: "Log out",
    version: "Version",
    
    selectLanguage: "Select Language",
    close: "Close",
    aboutTheApp: "About the App",
    appDescription1: "MapeIA is a professional environmental inspection platform designed for field technicians working in remote areas of hydroelectric reservoirs.",
    appDescription2: "The app replaces paper forms with a digital solution featuring offline capability, photo capture, UTM coordinate polygon mapping, and automated PDF and Word report generation.",
    features: "Features",
    featureOffline: "Offline mode with sync",
    featurePhotos: "Photo capture with captions",
    featurePolygon: "UTM polygon mapping",
    featureGPS: "Automatic GPS capture",
    featureReports: "PDF and Word report generation",
    developedBy: "Developed by",
    by: "by",
    
    notificationsTitle: "Notifications",
    notificationsWebMessage: "To manage browser notifications, access your browser settings.",
    notificationsEnabled: "Notifications are enabled",
    notificationsDisabled: "Notifications are disabled",
    notificationsSettings: "Notification Settings",
    openSettings: "Open Settings",
    error: "Error",
    errorOpenSettings: "Could not open device settings.",
    
    welcome: "Welcome",
    totalInspections: "Total Inspections",
    pending: "Pending",
    synced: "Synced",
    syncNow: "Sync Now",
    recentInspections: "Recent Inspections",
    noInspections: "No inspections recorded",
    
    home: "Home",
    inspections: "Inspections",
    profile: "Profile",
    newInspection: "New Inspection",
    
    // New Settings
    darkMode: "Theme",
    biometricLogin: "Biometric Login",
    backupData: "Data Backup",
    shareApp: "Share App",
    resetTutorial: "View Tutorial",
    
    // Dark Mode Options
    lightMode: "Light",
    darkModeOption: "Dark",
    systemMode: "Auto",
    selectTheme: "Select Theme",
    
    // Biometric
    biometricTitle: "Biometric Login",
    biometricEnabled: "Biometric login is enabled. Use your fingerprint or Face ID to quickly access the app.",
    biometricDisabled: "Enable biometric login for faster and more secure access to the app.",
    biometricNotAvailable: "Your device doesn't support biometric authentication or no biometrics are enrolled.",
    biometricEnablePrompt: "Authenticate to enable biometric login",
    biometricDisablePrompt: "Authenticate to disable biometric login",
    enableBiometric: "Enable Biometrics",
    disableBiometric: "Disable Biometrics",
    
    // Backup
    backupTitle: "Data Backup",
    backupDescription: "Export your inspections to keep a backup copy of your data.",
    exportJSON: "Export JSON",
    exportCSV: "Export CSV",
    backupSuccess: "Backup exported successfully!",
    backupError: "Error exporting backup",
    
    // Share
    shareTitle: "Share",
    shareViaWhatsApp: "WhatsApp",
    shareViaEmail: "Email",
    shareOther: "Other",
    shareMessage: "Check out MapeIA - the environmental inspection platform! Download now:",
    
    // Tutorial
    tutorialReset: "Tutorial reset!",
    tutorialResetSuccess: "The tutorial will be shown again next time you open the app.",
    
    // Search
    search: "Search",
    searchPlaceholder: "Search by owner, city...",
    noResults: "No results found",
    filterByDate: "Filter by date",
    filterByStatus: "Filter by status",
    all: "All",
    
    // Validation
    requiredField: "This field is required",
    invalidEmail: "Invalid email",
    invalidPhone: "Invalid phone",
    
    // Voice Notes
    voiceNote: "Voice Note",
    startRecording: "Start Recording",
    stopRecording: "Stop Recording",
    playRecording: "Play",
    deleteRecording: "Delete Recording",
    
    // Charts
    statistics: "Statistics",
    monthlyChart: "Inspections by Month",
    statusChart: "Inspection Status",
    
    // History
    changeHistory: "Change History",
    lastModified: "Last modified",
    modifiedBy: "Modified by",
    
    // General
    save: "Save",
    delete: "Delete",
    confirm: "Confirm",
    success: "Success",
    loading: "Loading...",
  },
  
  "Español": {
    settings: "Configuración",
    notifications: "Notificaciones",
    language: "Idioma",
    aboutApp: "Acerca de la App",
    logout: "Cerrar sesión",
    logoutConfirmTitle: "Cerrar sesión",
    logoutConfirmMessage: "¿Estás seguro de que deseas cerrar sesión?",
    cancel: "Cancelar",
    exit: "Salir",
    version: "Versión",
    
    selectLanguage: "Seleccionar Idioma",
    close: "Cerrar",
    aboutTheApp: "Acerca de la Aplicación",
    appDescription1: "MapeIA es una plataforma profesional de inspecciones ambientales diseñada para técnicos de campo que trabajan en áreas remotas de embalses hidroeléctricos.",
    appDescription2: "La aplicación reemplaza los formularios en papel con una solución digital con capacidad offline, captura de fotos, mapeo de polígonos por coordenadas UTM y generación automatizada de informes en PDF y Word.",
    features: "Funcionalidades",
    featureOffline: "Modo offline con sincronización",
    featurePhotos: "Captura de fotos con leyendas",
    featurePolygon: "Mapeo de polígonos UTM",
    featureGPS: "Captura automática de GPS",
    featureReports: "Generación de informes PDF y Word",
    developedBy: "Desarrollado por",
    by: "por",
    
    notificationsTitle: "Notificaciones",
    notificationsWebMessage: "Para gestionar las notificaciones del navegador, accede a la configuración de tu navegador.",
    notificationsEnabled: "Las notificaciones están activadas",
    notificationsDisabled: "Las notificaciones están desactivadas",
    notificationsSettings: "Configuración de Notificaciones",
    openSettings: "Abrir Configuración",
    error: "Error",
    errorOpenSettings: "No se pudo abrir la configuración del dispositivo.",
    
    welcome: "Bienvenido",
    totalInspections: "Total de Inspecciones",
    pending: "Pendientes",
    synced: "Sincronizadas",
    syncNow: "Sincronizar Ahora",
    recentInspections: "Inspecciones Recientes",
    noInspections: "Sin inspecciones registradas",
    
    home: "Inicio",
    inspections: "Inspecciones",
    profile: "Perfil",
    newInspection: "Nueva Inspección",
    
    // New Settings
    darkMode: "Tema",
    biometricLogin: "Login Biométrico",
    backupData: "Copia de Seguridad",
    shareApp: "Compartir App",
    resetTutorial: "Ver Tutorial",
    
    // Dark Mode Options
    lightMode: "Claro",
    darkModeOption: "Oscuro",
    systemMode: "Automático",
    selectTheme: "Seleccionar Tema",
    
    // Biometric
    biometricTitle: "Login Biométrico",
    biometricEnabled: "El login biométrico está activado. Usa tu huella digital o Face ID para acceder rápidamente a la app.",
    biometricDisabled: "Activa el login biométrico para acceder a la app de forma más rápida y segura.",
    biometricNotAvailable: "Tu dispositivo no soporta autenticación biométrica o no hay biometría registrada.",
    biometricEnablePrompt: "Autentícate para activar el login biométrico",
    biometricDisablePrompt: "Autentícate para desactivar el login biométrico",
    enableBiometric: "Activar Biometría",
    disableBiometric: "Desactivar Biometría",
    
    // Backup
    backupTitle: "Copia de Seguridad",
    backupDescription: "Exporta tus inspecciones para mantener una copia de seguridad de tus datos.",
    exportJSON: "Exportar JSON",
    exportCSV: "Exportar CSV",
    backupSuccess: "¡Copia de seguridad exportada con éxito!",
    backupError: "Error al exportar copia de seguridad",
    
    // Share
    shareTitle: "Compartir",
    shareViaWhatsApp: "WhatsApp",
    shareViaEmail: "Correo",
    shareOther: "Otros",
    shareMessage: "¡Conoce MapeIA - la plataforma de inspecciones ambientales! Descárgalo ahora:",
    
    // Tutorial
    tutorialReset: "¡Tutorial reiniciado!",
    tutorialResetSuccess: "El tutorial se mostrará de nuevo la próxima vez que abras la app.",
    
    // Search
    search: "Buscar",
    searchPlaceholder: "Buscar por propietario, municipio...",
    noResults: "Sin resultados",
    filterByDate: "Filtrar por fecha",
    filterByStatus: "Filtrar por estado",
    all: "Todos",
    
    // Validation
    requiredField: "Este campo es obligatorio",
    invalidEmail: "Correo inválido",
    invalidPhone: "Teléfono inválido",
    
    // Voice Notes
    voiceNote: "Nota de Voz",
    startRecording: "Iniciar Grabación",
    stopRecording: "Detener Grabación",
    playRecording: "Reproducir",
    deleteRecording: "Eliminar Grabación",
    
    // Charts
    statistics: "Estadísticas",
    monthlyChart: "Inspecciones por Mes",
    statusChart: "Estado de Inspecciones",
    
    // History
    changeHistory: "Historial de Cambios",
    lastModified: "Última modificación",
    modifiedBy: "Modificado por",
    
    // General
    save: "Guardar",
    delete: "Eliminar",
    confirm: "Confirmar",
    success: "Éxito",
    loading: "Cargando...",
  },
};

export function getTranslations(language: Language): Translations {
  return translations[language];
}

export default translations;
