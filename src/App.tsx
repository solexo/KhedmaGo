import { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { ClientInterface } from './components/ClientInterface';
import { ProfessionalDashboard } from './components/ProfessionalDashboard';
import { ProfessionalSetup } from './components/ProfessionalSetup';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { supabase } from './lib/supabase';
import { LogOut, Languages } from 'lucide-react';

function App() {
   const { user, profile, loading, signOut } = useAuth();
   const { language, setLanguage, t, isRTL } = useLanguage();
   const [needsProfessionalSetup, setNeedsProfessionalSetup] = useState(false);
   const [checkingProfessionalSetup, setCheckingProfessionalSetup] = useState(true);
   const [userRole, setUserRole] = useState<'client' | 'worker' | null>(null);

   console.log('App render:', { user: !!user, profile, loading, userRole });

  useEffect(() => {
    if (profile?.user_type === 'professional') {
      checkProfessionalSetup();
    } else {
      setCheckingProfessionalSetup(false);
    }
  }, [profile]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#client') {
        setUserRole('client');
      } else if (hash === '#worker') {
        setUserRole('worker');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  async function checkProfessionalSetup() {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('id')
        .eq('id', profile?.id)
        .maybeSingle();

      if (error) throw error;
      setNeedsProfessionalSetup(!data);
    } catch (error) {
      console.error('Error checking professional setup:', error);
    } finally {
      setCheckingProfessionalSetup(false);
    }
  }

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'ar' : 'fr');
  };

  if (loading || checkingProfessionalSetup) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // If authenticated as professional, show professional interface
  if (user && profile?.user_type === 'professional') {
    if (needsProfessionalSetup) {
      return <ProfessionalSetup onComplete={() => setNeedsProfessionalSetup(false)} />;
    }

    return (
      <div className="h-screen flex flex-col">
        <header className="bg-white border-b shadow-sm py-3 px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <span className="text-white text-xl font-bold">🔧</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('app.title')}</h1>
              <p className="text-sm text-gray-600">
                Professionnel • {profile.full_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Languages className="w-4 h-4" />
              <span className="text-sm font-medium">{language === 'fr' ? 'العربية' : 'FR'}</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <ProfessionalDashboard />
        </div>
      </div>
    );
  }

  // If not authenticated and no role selected, show role selection
  if (!user && !userRole) {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-white border-b shadow-sm py-3 px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <span className="text-white text-xl font-bold">🔧</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('app.title')}</h1>
              <p className="text-sm text-gray-600">{t('app.tagline')}</p>
            </div>
          </div>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Languages className="w-4 h-4" />
            <span className="text-sm font-medium">{language === 'fr' ? 'العربية' : 'FR'}</span>
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
            <div className="mb-6">
              <div className="bg-emerald-600 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                <span className="text-white text-3xl">🔧</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('client.welcome')}</h2>
              <p className="text-gray-600 mb-8">{t('app.tagline')}</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setUserRole('client')}
                className="w-full bg-emerald-600 text-white py-4 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-3"
              >
                <span className="text-2xl">👤</span>
                <span>Je suis Client</span>
              </button>

              <button
                onClick={() => setUserRole('worker')}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🔧</span>
                <span>Je suis Professionnel</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If client selected but not authenticated, show client interface
  if (!user && userRole === 'client') {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-white border-b shadow-sm py-3 px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <span className="text-white text-xl font-bold">🔧</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('app.title')}</h1>
              <p className="text-sm text-gray-600">{t('app.tagline')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUserRole(null)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium">← Retour</span>
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Languages className="w-4 h-4" />
              <span className="text-sm font-medium">{language === 'fr' ? 'العربية' : 'FR'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <ClientInterface />
        </div>
      </div>
    );
  }

  // If worker selected but not authenticated, show auth
  if (!user && userRole === 'worker') {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-white border-b shadow-sm py-3 px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <span className="text-white text-xl font-bold">🔧</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('app.title')}</h1>
              <p className="text-sm text-gray-600">{t('app.tagline')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUserRole(null)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium">← Retour</span>
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Languages className="w-4 h-4" />
              <span className="text-sm font-medium">{language === 'fr' ? 'العربية' : 'FR'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <Auth />
        </div>
      </div>
    );
  }

  // If authenticated as client, show client interface
  if (user && profile?.user_type === 'client') {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-white border-b shadow-sm py-3 px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <span className="text-white text-xl font-bold">🔧</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('app.title')}</h1>
              <p className="text-sm text-gray-600">Client • {profile.full_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Languages className="w-4 h-4" />
              <span className="text-sm font-medium">{language === 'fr' ? 'العربية' : 'FR'}</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <ClientInterface />
        </div>
      </div>
    );
  }

  // If authenticated as professional, show professional interface
  if (user && profile?.user_type === 'professional') {
    if (needsProfessionalSetup) {
      return <ProfessionalSetup onComplete={() => setNeedsProfessionalSetup(false)} />;
    }

    return (
      <div className="h-screen flex flex-col">
        <header className="bg-white border-b shadow-sm py-3 px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <span className="text-white text-xl font-bold">🔧</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('app.title')}</h1>
              <p className="text-sm text-gray-600">
                Professionnel • {profile.full_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Languages className="w-4 h-4" />
              <span className="text-sm font-medium">{language === 'fr' ? 'العربية' : 'FR'}</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <ProfessionalDashboard />
        </div>
      </div>
    );
  }

  // Fallback - if authenticated but no profile, assume professional (from worker selection)
  if (user && !profile && userRole === 'worker') {
    console.log('Authenticated user with no profile, assuming professional setup needed');
    return <ProfessionalSetup onComplete={() => window.location.reload()} />;
  }

  // Fallback - redirect to auth if authenticated but no profile
  console.log('Fallback: showing Auth component');
  return <Auth />;
}

export default App;
