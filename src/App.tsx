import { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { RiderDashboard } from './components/RiderDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { DriverSetup } from './components/DriverSetup';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { LogOut } from 'lucide-react';

function App() {
  const { user, profile, loading, signOut } = useAuth();
  const [needsDriverSetup, setNeedsDriverSetup] = useState(false);
  const [checkingDriverSetup, setCheckingDriverSetup] = useState(true);

  useEffect(() => {
    if (profile?.user_type === 'driver') {
      checkDriverSetup();
    } else {
      setCheckingDriverSetup(false);
    }
  }, [profile]);

  async function checkDriverSetup() {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id')
        .eq('id', profile?.id)
        .maybeSingle();

      if (error) throw error;
      setNeedsDriverSetup(!data);
    } catch (error) {
      console.error('Error checking driver setup:', error);
    } finally {
      setCheckingDriverSetup(false);
    }
  }

  if (loading || checkingDriverSetup) {
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

  if (profile.user_type === 'driver' && needsDriverSetup) {
    return <DriverSetup onComplete={() => setNeedsDriverSetup(false)} />;
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b shadow-sm py-3 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <span className="text-white text-xl font-bold">🚕</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Morocco Ride</h1>
            <p className="text-sm text-gray-600">
              {profile.user_type === 'rider' ? 'Passager' : 'Chauffeur'} • {profile.full_name}
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

      <div className="flex-1 overflow-hidden">
        {profile.user_type === 'rider' ? <RiderDashboard /> : <DriverDashboard />}
      </div>
    </div>
  );
}

export default App;
