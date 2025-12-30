import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'fr' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  fr: {
    // App
    'app.title': 'KhedmaGo',
    'app.tagline': 'Connectez-vous avec des professionnels locaux',

    // Client
    'client.welcome': 'Bienvenue sur KhedmaGo',
    'client.name': 'Votre nom',
    'client.name.placeholder': 'Entrez votre nom',
    'client.select.service': 'Sélectionnez un service',
    'client.activate.location': 'Activer la localisation',
    'client.location.required': 'La localisation est requise pour continuer',
    'client.request.sent': 'Demande envoyée !',
    'client.waiting': 'En attente d\'un professionnel...',
    'client.job.accepted': 'Professionnel trouvé !',
    'client.history': 'Historique',

    // Worker
    'worker.available': 'Disponible',
    'worker.busy': 'Occupé',
    'worker.accept': 'Accepter',
    'worker.navigate': 'Naviguer',

    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.retry': 'Réessayer',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
  },
  ar: {
    // App
    'app.title': 'خدمة',
    'app.tagline': 'تواصل مع المهنيين المحليين',

    // Client
    'client.welcome': 'مرحبا بك في خدمة',
    'client.name': 'اسمك',
    'client.name.placeholder': 'أدخل اسمك',
    'client.select.service': 'اختر خدمة',
    'client.activate.location': 'تفعيل الموقع',
    'client.location.required': 'الموقع مطلوب للمتابعة',
    'client.request.sent': 'تم إرسال الطلب!',
    'client.waiting': 'في انتظار مهني...',
    'client.job.accepted': 'تم العثور على مهني!',
    'client.history': 'التاريخ',

    // Worker
    'worker.available': 'متاح',
    'worker.busy': 'مشغول',
    'worker.accept': 'قبول',
    'worker.navigate': 'التنقل',

    // Common
    'common.loading': 'جار التحميل...',
    'common.error': 'خطأ',
    'common.retry': 'إعادة المحاولة',
    'common.cancel': 'إلغاء',
    'common.confirm': 'تأكيد',
    'common.back': 'العودة',
    'common.next': 'التالي',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.fr] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'font-arabic' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}