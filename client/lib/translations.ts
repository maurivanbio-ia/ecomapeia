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
    developedBy: "Desenvolvido por",
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
  },
};

export function getTranslations(language: Language): Translations {
  return translations[language];
}

export default translations;
