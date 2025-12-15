import { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { ClientDashboard } from './components/ClientDashboard';
import { ProfessionalDashboard } from './components/ProfessionalDashboard';
import { ProfessionalSetup } from './components/ProfessionalSetup';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { LogOut } from 'lucide-react';

function App() {
  const { user, profile, loading, signOut } = useAuth();
  const [needsProfessionalSetup, setNeedsProfessionalSetup] = useState(false);
  const [checkingProfessionalSetup, setCheckingProfessionalSetup] = useState(true);

  useEffect(() => {
    if (profile?.user_type === 'professional') {
      checkProfessionalSetup();
    } else {
      setCheckingProfessionalSetup(false);
    }
  }, [profile]);

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

  if (loading || checkingProfessionalSetup) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth />;
  }

  if (profile.user_type === 'professional' && needsProfessionalSetup) {
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
            <h1 className="text-xl font-bold text-gray-900">KhedmaGo</h1>
            <p className="text-sm text-gray-600">
              {profile.user_type === 'client' ? 'Client' : 'Professionnel'} • {profile.full_name}
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Déconnexion</span>
        </button>
      </header>

      <div className="flex-1 overflow-auto">
        {profile.user_type === 'client' ? <ClientDashboard /> : <ProfessionalDashboard />}
      </div>
    </div>
  );
}

export default App;
