import { useState, useEffect } from 'react';
import { supabase, Profession, JobRequest } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Map } from './Map';
import { Chat } from './Chat';
import { MapPin, MessageCircle, CheckCircle, X, Clock } from 'lucide-react';

export function ClientInterface() {
   const { t } = useLanguage();
   const [clientName, setClientName] = useState('');
   const [clientPhone, setClientPhone] = useState('');
   const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
   const [selectedProfession, setSelectedProfession] = useState<Profession | null>(null);
   const [professions, setProfessions] = useState<Profession[]>([]);
   const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
   const [currentRequest, setCurrentRequest] = useState<JobRequest | null>(null);
   const [showProfessionSelector, setShowProfessionSelector] = useState(false);
   const [showHistory, setShowHistory] = useState(false);
   const [jobHistory, setJobHistory] = useState<JobRequest[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');
   const [cancellationCount, setCancellationCount] = useState(0);
   const [lastCancellationTime, setLastCancellationTime] = useState<number | null>(null);
   const [isBanned, setIsBanned] = useState(false);
   const [banExpiry, setBanExpiry] = useState<number | null>(null);
   const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    loadProfessions();
    getUserLocation();
    loadCancellationData();
  }, []);

  useEffect(() => {
    if (currentRequest) {
      const interval = setInterval(() => {
        loadCurrentRequest();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentRequest]);

  // Load cancellation data from localStorage
  function loadCancellationData() {
    const stored = localStorage.getItem('client_cancellation_data');
    if (stored) {
      const data = JSON.parse(stored);
      setCancellationCount(data.count || 0);
      setLastCancellationTime(data.lastTime || null);
      setIsBanned(data.isBanned || false);
      setBanExpiry(data.banExpiry || null);

      // Check if ban has expired
      if (data.banExpiry && Date.now() > data.banExpiry) {
        setIsBanned(false);
        setBanExpiry(null);
        setCancellationCount(0);
        localStorage.removeItem('client_cancellation_data');
      }
    }
  }

  // Save cancellation data to localStorage
  function saveCancellationData() {
    const data = {
      count: cancellationCount,
      lastTime: lastCancellationTime,
      isBanned,
      banExpiry
    };
    localStorage.setItem('client_cancellation_data', JSON.stringify(data));
  }

  // Check if user can cancel (not banned, not in waiting period)
  function canCancel(): { allowed: boolean; reason?: string } {
    if (isBanned) {
      return { allowed: false, reason: 'Vous êtes banni temporairement' };
    }

    if (banExpiry && Date.now() < banExpiry) {
      const remainingMinutes = Math.ceil((banExpiry - Date.now()) / (1000 * 60));
      return { allowed: false, reason: `Attendez ${remainingMinutes} minutes` };
    }

    return { allowed: true };
  }

  async function loadCurrentRequest() {
    if (!currentRequest) return;
    try {
      const { data, error } = await supabase
        .from('job_requests')
        .select('*, profession:professions(*)')
        .eq('id', currentRequest.id)
        .single();

      if (data && !error) {
        setCurrentRequest(data);
      }
    } catch (error) {
      console.error('Error loading current request:', error);
    }
  }

  async function loadProfessions() {
    console.log('Loading professions...');
    try {
      const { data, error } = await supabase
        .from('professions')
        .select('*')
        .order('name_fr');

      console.log('Professions data:', data);
      console.log('Professions error:', error);

      if (error) {
        console.error('Error loading professions:', error);
        // Fallback: show some default professions if RLS blocks access
        setProfessions([
          { id: '1', name_fr: 'Plombier', name_ar: 'سباك', icon: '🔧', created_at: '' },
          { id: '2', name_fr: 'Électricien', name_ar: 'كهربائي', icon: '⚡', created_at: '' },
          { id: '3', name_fr: 'Mécanicien', name_ar: 'ميكانيكي', icon: '🔨', created_at: '' },
          { id: '4', name_fr: 'Menuisier', name_ar: 'نجار', icon: '🪚', created_at: '' },
          { id: '5', name_fr: 'Peintre', name_ar: 'دهان', icon: '🎨', created_at: '' },
          { id: '6', name_fr: 'Jardinier', name_ar: 'بستاني', icon: '🌱', created_at: '' },
          { id: '7', name_fr: 'Cuisinier', name_ar: 'طباخ', icon: '👨‍🍳', created_at: '' },
          { id: '8', name_fr: 'Réparateur TV', name_ar: 'مصلح تلفزيون', icon: '📺', created_at: '' },
          { id: '9', name_fr: 'Coiffeur', name_ar: 'حلاق', icon: '✂️', created_at: '' },
          { id: '10', name_fr: 'Nettoyeur', name_ar: 'منظف', icon: '🧹', created_at: '' },
          { id: '11', name_fr: 'Maçon', name_ar: 'بناء', icon: '🏗️', created_at: '' },
          { id: '12', name_fr: 'Carreleur', name_ar: 'مبلط', icon: '🟦', created_at: '' },
          { id: '13', name_fr: 'Serrurier', name_ar: 'مقفل', icon: '🔐', created_at: '' },
          { id: '14', name_fr: 'Vitrier', name_ar: 'زجاجي', icon: '🪟', created_at: '' },
          { id: '15', name_fr: 'Chauffagiste', name_ar: 'سخانات', icon: '🔥', created_at: '' },
        ]);
        return;
      }
      if (data && data.length > 0) {
        setProfessions(data);
      } else {
        // If no data from database, use fallback
        setProfessions([
          { id: '1', name_fr: 'Plombier', name_ar: 'سباك', icon: '🔧', created_at: '' },
          { id: '2', name_fr: 'Électricien', name_ar: 'كهربائي', icon: '⚡', created_at: '' },
          { id: '3', name_fr: 'Mécanicien', name_ar: 'ميكانيكي', icon: '🔨', created_at: '' },
          { id: '4', name_fr: 'Menuisier', name_ar: 'نجار', icon: '🪚', created_at: '' },
          { id: '5', name_fr: 'Peintre', name_ar: 'دهان', icon: '🎨', created_at: '' },
          { id: '6', name_fr: 'Jardinier', name_ar: 'بستاني', icon: '🌱', created_at: '' },
          { id: '7', name_fr: 'Cuisinier', name_ar: 'طباخ', icon: '👨‍🍳', created_at: '' },
          { id: '8', name_fr: 'Réparateur TV', name_ar: 'مصلح تلفزيون', icon: '📺', created_at: '' },
          { id: '9', name_fr: 'Coiffeur', name_ar: 'حلاق', icon: '✂️', created_at: '' },
          { id: '10', name_fr: 'Nettoyeur', name_ar: 'منظف', icon: '🧹', created_at: '' },
          { id: '11', name_fr: 'Maçon', name_ar: 'بناء', icon: '🏗️', created_at: '' },
          { id: '12', name_fr: 'Carreleur', name_ar: 'مبلط', icon: '🟦', created_at: '' },
          { id: '13', name_fr: 'Serrurier', name_ar: 'مقفل', icon: '🔐', created_at: '' },
          { id: '14', name_fr: 'Vitrier', name_ar: 'زجاجي', icon: '🪟', created_at: '' },
          { id: '15', name_fr: 'Chauffagiste', name_ar: 'سخانات', icon: '🔥', created_at: '' },
        ]);
      }
    } catch (error) {
      console.error('Error loading professions:', error);
      // Fallback professions
      setProfessions([
        { id: '1', name_fr: 'Plombier', name_ar: 'سباك', icon: '🔧', created_at: '' },
        { id: '2', name_fr: 'Électricien', name_ar: 'كهربائي', icon: '⚡', created_at: '' },
        { id: '3', name_fr: 'Mécanicien', name_ar: 'ميكانيكي', icon: '🔨', created_at: '' },
        { id: '4', name_fr: 'Menuisier', name_ar: 'نجار', icon: '🪚', created_at: '' },
        { id: '5', name_fr: 'Peintre', name_ar: 'دهان', icon: '🎨', created_at: '' },
        { id: '6', name_fr: 'Jardinier', name_ar: 'بستاني', icon: '🌱', created_at: '' },
        { id: '7', name_fr: 'Cuisinier', name_ar: 'طباخ', icon: '👨‍🍳', created_at: '' },
        { id: '8', name_fr: 'Réparateur TV', name_ar: 'مصلح تلفزيون', icon: '📺', created_at: '' },
        { id: '9', name_fr: 'Coiffeur', name_ar: 'حلاق', icon: '✂️', created_at: '' },
        { id: '10', name_fr: 'Nettoyeur', name_ar: 'منظف', icon: '🧹', created_at: '' },
        { id: '11', name_fr: 'Maçon', name_ar: 'بناء', icon: '🏗️', created_at: '' },
        { id: '12', name_fr: 'Carreleur', name_ar: 'مبلط', icon: '🟦', created_at: '' },
        { id: '13', name_fr: 'Serrurier', name_ar: 'مقفل', icon: '🔐', created_at: '' },
        { id: '14', name_fr: 'Vitrier', name_ar: 'زجاجي', icon: '🪟', created_at: '' },
        { id: '15', name_fr: 'Chauffagiste', name_ar: 'سخانات', icon: '🔥', created_at: '' },
      ]);
    }
  }

  async function getUserLocation() {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par ce navigateur');
      // Fallback to Casablanca for demo purposes
      setUserLocation([33.5731, -7.5898]);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('User location:', latitude, longitude);
        setUserLocation([latitude, longitude]);
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        // Fallback to Casablanca for demo purposes
        console.log('Using fallback location: Casablanca');
        setUserLocation([33.5731, -7.5898]);
        setLoading(false);
      }
    );
  }

  async function createJobRequest(profession: Profession) {
    if (!clientName.trim() || !clientPhone.trim()) return;

    // Use current location or fallback to Casablanca
    const location = userLocation || [33.5731, -7.5898];

    console.log('Creating job request:', {
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      profession_id: profession.id,
      latitude: location[0],
      longitude: location[1],
      status: 'pending'
    });

    try {
      const { data, error } = await supabase
        .from('job_requests')
        .insert({
          client_name: clientName.trim(),
          client_phone: clientPhone.trim(),
          profession_id: profession.id,
          latitude: location[0],
          longitude: location[1],
          status: 'pending'
        })
        .select('*, profession:professions(*)')
        .single();

      console.log('Job request creation result:', { data, error });

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });

        // If it's a permission error, create a mock request for demo purposes
        if (error.message?.includes('permission denied') || error.code === 'PGRST116') {
          console.log('Permission denied, creating mock request for demo');
          const mockRequest = {
            id: 'mock-' + Date.now(),
            client_name: clientName.trim(),
            client_phone: clientPhone.trim(),
            profession_id: profession.id,
            latitude: location[0],
            longitude: location[1],
            status: 'pending',
            created_at: new Date().toISOString(),
            profession: profession
          };
          setCurrentRequest(mockRequest as any);
          setSelectedProfession(profession);
          setShowProfessionSelector(false);
          setError('');
          alert('Demande créée (mode démo - base de données non disponible)');
          return;
        }

        throw error;
      }

      setCurrentRequest(data);
      setSelectedProfession(profession);
      setShowProfessionSelector(false);
      setError(''); // Clear any previous errors
    } catch (error: any) {
      console.error('Error creating job request:', error);
      const errorMessage = error?.message || error?.code || 'Unknown error';
      setError(`Erreur lors de la création de la demande: ${errorMessage}`);

      // Show user-friendly message
      alert(`Erreur lors de la création de la demande: ${errorMessage}`);
    }
  }

  async function acceptNegotiation() {
    if (!currentRequest) return;

    try {
      // Check if worker already accepted
      const shouldStartJob = currentRequest.worker_accepted_at;

      const newStatus = shouldStartJob ? 'in_progress' : 'accepted';

      const { error } = await supabase
        .from('job_requests')
        .update({
          status: newStatus,
          client_accepted_at: new Date().toISOString(),
          ...(shouldStartJob && { accepted_at: new Date().toISOString() })
        })
        .eq('id', currentRequest.id);

      if (error) throw error;

      setCurrentRequest(prev => prev ? {
        ...prev,
        status: newStatus as any,
        client_accepted_at: new Date().toISOString(),
        ...(shouldStartJob && { accepted_at: new Date().toISOString() })
      } : null);

      // Open chat automatically when client accepts
      setShowChat(true);
    } catch (error) {
      console.error('Error accepting negotiation:', error);
    }
  }

  async function completeJob() {
    if (!currentRequest) return;

    try {
      const { error } = await supabase
        .from('job_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentRequest.id);

      if (error) throw error;

      setCurrentRequest(null);
      setSelectedProfession(null);
    } catch (error) {
      console.error('Error completing job:', error);
    }
  }

  async function cancelRequest() {
    if (!currentRequest) return;

    // Check if user can cancel
    const cancelCheck = canCancel();
    if (!cancelCheck.allowed) {
      alert(cancelCheck.reason);
      return;
    }

    // Confirm cancellation
    if (!confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) {
      return;
    }

    try {
      // Update cancellation tracking
      const now = Date.now();
      let newCount = cancellationCount + 1;
      let newBanExpiry = null;

      // Check for penalties
      if (newCount >= 24) {
        // Permanent ban for 24 hours
        newBanExpiry = now + (24 * 60 * 60 * 1000); // 24 hours
        setIsBanned(true);
        alert('Vous avez été banni pour 24 heures en raison de trop d\'annulations.');
      } else if (newCount >= 3) {
        // 1 hour waiting period
        newBanExpiry = now + (60 * 60 * 1000); // 1 hour
        alert('Trop d\'annulations. Vous devez attendre 1 heure avant de faire une nouvelle demande.');
      }

      setCancellationCount(newCount);
      setLastCancellationTime(now);
      setBanExpiry(newBanExpiry);
      saveCancellationData();

      // Add to history
      setJobHistory(prev => [...prev, { ...currentRequest, status: 'cancelled' as const }]);

      // Update request status
      await supabase
        .from('job_requests')
        .update({ status: 'cancelled' })
        .eq('id', currentRequest.id);

      setCurrentRequest(null);
      setSelectedProfession(null);
    } catch (error) {
      console.error('Error cancelling request:', error);
      // Still update local state for demo
      setJobHistory(prev => [...prev, { ...currentRequest, status: 'cancelled' as const }]);
      setCurrentRequest(null);
      setSelectedProfession(null);
    }
  }

  // Load job history
  function loadHistory() {
    // In a real app, this would fetch from database
    // For now, just show what we have in state
    setShowHistory(true);
  }

  // Show name and phone input if setup not completed
  if (!hasCompletedSetup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="mb-6">
            <div className="bg-emerald-600 p-4 rounded-full w-20 h-20 mx-auto mb-4">
              <span className="text-white text-3xl">👤</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('client.welcome')}</h2>
            <p className="text-gray-600">{t('app.tagline')}</p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('client.name')}
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t('client.name.placeholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+212 6XX XXX XXX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
                autoComplete="tel"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                // Complete setup and proceed to main interface
                // If location failed, use Casablanca as fallback
                if (!userLocation) {
                  setUserLocation([33.5731, -7.5898]);
                }
                setHasCompletedSetup(true);
              }}
              disabled={!clientName.trim() || !clientPhone.trim() || loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Localisation...' : 'Commencer'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Sidebar Menu */}
      <div className="w-64 bg-white border-r shadow-sm flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <span className="text-white text-xl font-bold">👤</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{clientName}</h3>
              {selectedProfession && (
                <p className="text-sm text-emerald-600 flex items-center gap-1">
                  <span>{selectedProfession.icon}</span>
                  {selectedProfession.name_fr}
                </p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <button
              onClick={() => setShowProfessionSelector(true)}
              className="w-full bg-emerald-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">🔧</span>
              {selectedProfession ? 'Changer de service' : 'Choisir un service'}
            </button>

            <button
              onClick={() => setShowHistory(true)}
              className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">📋</span>
              Historique
            </button>

            {currentRequest && (
              <button
                onClick={cancelRequest}
                className="w-full bg-red-100 text-red-700 px-4 py-3 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
              >
                <span className="text-lg">❌</span>
                Annuler la demande
              </button>
            )}
          </div>
        </nav>

        {/* Status */}
        {currentRequest && (
          <div className="p-4 border-t">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium text-sm">
                  {currentRequest.status === 'pending' && 'En attente d\'un professionnel...'}
                  {currentRequest.status === 'negotiating' && 'Négociation en cours...'}
                  {currentRequest.status === 'accepted' && 'Travail accepté - En cours'}
                  {currentRequest.status === 'in_progress' && 'Travail en cours...'}
                  {currentRequest.status === 'completed' && 'Travail terminé'}
                </span>
              </div>

              {/* Action buttons for current request */}
              {currentRequest.status === 'negotiating' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={acceptNegotiation}
                    className="flex-1 bg-green-600 text-white py-2 px-3 rounded font-medium hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Accepter
                  </button>
                  <button
                    onClick={cancelRequest}
                    className="flex-1 bg-red-100 text-red-700 py-2 px-3 rounded font-medium hover:bg-red-200 transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Refuser
                  </button>
                </div>
              )}

              {currentRequest.status === 'in_progress' && (
                <button
                  onClick={completeJob}
                  className="w-full bg-green-600 text-white py-2 px-3 rounded font-medium hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2 mt-2"
                >
                  <CheckCircle className="w-3 h-3" />
                  Travail terminé
                </button>
              )}

              {(currentRequest.status === 'accepted' || currentRequest.status === 'in_progress') && (
                <button
                  onClick={() => setShowChat(true)}
                  className="w-full bg-blue-600 text-white py-2 px-3 rounded font-medium hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2 mt-2"
                >
                  <MessageCircle className="w-3 h-3" />
                  Discuter
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Map Container - Smaller and styled */}
        <div className="flex-1 p-4">
          <div className="h-full max-h-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <Map
              center={userLocation || [33.5731, -7.5898]}
              zoom={userLocation ? 15 : 12}
              clientLocation={userLocation}
              clientRequests={currentRequest ? [currentRequest] : []}
              onRequestNegotiation={(requestId) => {
                // Handle when worker starts negotiation
                setCurrentRequest(prev => prev && prev.id === requestId ? {
                  ...prev,
                  status: 'negotiating' as const
                } : prev);
              }}
            />
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Historique des demandes</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {jobHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-gray-600">Aucune demande dans l'historique</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobHistory.map((request, index) => (
                    <div key={request.id || index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{request.profession?.icon}</div>
                          <div>
                            <h4 className="font-bold text-gray-900">{request.profession?.name_fr}</h4>
                            <p className="text-sm text-gray-600">{request.client_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                request.status === 'completed' ? 'bg-green-100 text-green-700' :
                                request.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {request.status === 'completed' && 'Terminé'}
                                {request.status === 'cancelled' && 'Annulé'}
                                {request.status === 'pending' && 'En attente'}
                                {request.status === 'accepted' && 'Accepté'}
                                {request.status === 'in_progress' && 'En cours'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(request.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profession Selector Modal */}
      {showProfessionSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Choisir un service</h2>
                <button
                  onClick={() => setShowProfessionSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {professions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔄</div>
                  <p className="text-gray-600">Chargement des services...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {professions.map((profession) => (
                    <button
                      key={profession.id}
                      onClick={() => createJobRequest(profession)}
                      className="bg-gray-50 rounded-xl p-4 hover:bg-emerald-50 hover:border-emerald-200 border-2 border-transparent hover:border-emerald-200 transition-all"
                    >
                      <div className="text-4xl mb-2">{profession.icon}</div>
                      <div className="text-sm font-medium text-gray-900">{profession.name_fr}</div>
                      <div className="text-xs text-gray-600">{profession.name_ar}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showChat && currentRequest && (
        <Chat
          jobRequestId={currentRequest.id}
          currentUserName={clientName}
          currentUserType="client"
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}