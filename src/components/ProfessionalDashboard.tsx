import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Professional, JobRequest } from '../lib/supabase';
import { Map } from './Map';
import { Chat } from './Chat';
import { Phone, MapPin, ToggleLeft, ToggleRight, CheckCircle, X, Clock, MessageCircle } from 'lucide-react';

export function ProfessionalDashboard() {
  const { user } = useAuth();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [jobRequests, setJobRequests] = useState<JobRequest[]>([]);
  const [currentJob, setCurrentJob] = useState<JobRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'active' | 'completed'>('pending');
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadProfessional();
      loadNearbyRequests();
    }
  }, [user]);

  useEffect(() => {
    if (professional?.profession_id) {
      loadNearbyRequests();
      const interval = setInterval(loadNearbyRequests, 3000);
      return () => clearInterval(interval);
    }
  }, [professional]);

  useEffect(() => {
    if (currentJob) {
      checkForMessages();
      const interval = setInterval(checkForMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [currentJob]);

  async function loadProfessional() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('*, profession:professions(*)')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfessional(data);
    } catch (error) {
      console.error('Error loading professional:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkForMessages() {
    if (!currentJob) return;

    console.log('Checking messages for job:', currentJob.id);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('job_request_id', currentJob.id);

      console.log('Message data:', data);
      if (error) throw error;

      const count = data?.length || 0;
      console.log('Message count:', count, 'previous:', messageCount);
      if (count > messageCount) {
        setMessageCount(count);
        if (!showChat) {
          console.log('Opening chat automatically for new messages');
          setShowChat(true);
        }
      }
    } catch (error) {
      console.error('Error checking messages:', error);
    }
  }

  async function loadNearbyRequests() {
    if (!professional) return;

    try {
      // Load all job requests for this profession
      const { data, error } = await supabase
        .from('job_requests')
        .select('*, profession:professions(*)')
        .eq('profession_id', professional.profession_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobRequests(data || []);
    } catch (error) {
      console.error('Error loading job requests:', error);
    }
  }

  async function updateAvailability(isAvailable: boolean) {
    if (!professional) return;
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ is_available: isAvailable })
        .eq('id', professional.id);

      if (error) throw error;
      setProfessional({ ...professional, is_available: isAvailable });
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  }

  async function startNegotiation(requestId: string) {
    try {
      const { error } = await supabase
        .from('job_requests')
        .update({
          status: 'negotiating',
          accepted_by: professional?.id,
          worker_accepted_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Send automatic acceptance message
      const acceptanceMessage = `Bonjour! J'ai accepté votre demande de service. Je m'appelle ${professional?.name}, téléphone: ${professional?.phone}. Nous pouvons discuter des détails maintenant.`;

      await supabase
        .from('messages')
        .insert({
          job_request_id: requestId,
          sender_type: 'professional',
          sender_name: professional?.name || 'Professional',
          message: acceptanceMessage
        });

      // Find the request and set currentJob
      const request = jobRequests.find(req => req.id === requestId);
      if (request) {
        const updatedRequest = { ...request, status: 'negotiating' as const, accepted_by: professional?.id, worker_accepted_at: new Date().toISOString() };
        setCurrentJob(updatedRequest);
      }

      // Update local state
      setJobRequests(prev => prev.map(req =>
        req.id === requestId
          ? { ...req, status: 'negotiating', accepted_by: professional?.id, worker_accepted_at: new Date().toISOString() }
          : req
      ));

    } catch (error) {
      console.error('Error starting negotiation:', error);
    }
  }

  async function acceptJob(requestId: string) {
    try {
      // Get the current request to check client acceptance
      const request = jobRequests.find(req => req.id === requestId);
      const shouldStartJob = request?.client_accepted_at;

      const newStatus = shouldStartJob ? 'in_progress' : 'accepted';

      const { error } = await supabase
        .from('job_requests')
        .update({
          status: newStatus,
          ...(shouldStartJob && { accepted_at: new Date().toISOString() })
        })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      if (shouldStartJob) {
        setJobRequests(prev => prev.filter(req => req.id !== requestId));
        setCurrentJob(prev => prev && prev.id === requestId ? { ...prev, status: 'in_progress', accepted_at: new Date().toISOString() } : prev);
        setProfessional(prev => prev ? { ...prev, is_available: false } : null);

        // Update availability in database
        await supabase
          .from('professionals')
          .update({ is_available: false })
          .eq('id', professional?.id);
      } else {
        const updatedRequest = { ...jobRequests.find(req => req.id === requestId)!, status: 'accepted' as const };
        setJobRequests(prev => prev.filter(req => req.id !== requestId));
        setCurrentJob(updatedRequest);
      }

    } catch (error) {
      console.error('Error accepting job:', error);
    }
  }

  function getFilteredRequests() {
    switch (selectedStatus) {
      case 'pending':
        return jobRequests.filter(r => r.status === 'pending');
      case 'active':
        return jobRequests.filter(r => r.status === 'accepted' || r.status === 'in_progress');
      case 'completed':
        return jobRequests.filter(r => r.status === 'completed' || r.status === 'cancelled');
      default:
        return jobRequests;
    }
  }

  async function completeJob(jobId: string) {
    try {
      const { error } = await supabase
        .from('job_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      setCurrentJob(null);
      setShowChat(false);
      setProfessional(prev => prev ? { ...prev, is_available: true } : null);

      // Update availability in database
      await supabase
        .from('professionals')
        .update({ is_available: true })
        .eq('id', professional?.id);
    } catch (error) {
      console.error('Error completing job:', error);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Profil professionnel non trouvé.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={professional.photo_url || 'https://via.placeholder.com/64x64?text=👤'}
              alt={professional.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-100"
            />
            <div>
              <h3 className="font-bold text-gray-900">{professional.name}</h3>
              <p className="text-sm text-emerald-600">{professional.profession?.name_fr}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateAvailability(!professional.is_available)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                professional.is_available
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {professional.is_available ? '🟢 Disponible' : '🔴 Indisponible'}
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setSelectedStatus('pending')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm ${
              selectedStatus === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Disponibles ({jobRequests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setSelectedStatus('active')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm ${
              selectedStatus === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            En cours ({jobRequests.filter(r => r.status === 'accepted' || r.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setSelectedStatus('completed')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm ${
              selectedStatus === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Terminés ({jobRequests.filter(r => r.status === 'completed' || r.status === 'cancelled').length})
          </button>
        </div>

        {/* Toggle between map and list */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowMap(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium ${
              showMap ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Carte
          </button>
          <button
            onClick={() => setShowMap(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium ${
              !showMap ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Demandes ({getFilteredRequests().length})
          </button>
        </div>
      </div>

      {/* Current Job Status */}
      {currentJob && (
        <div className="p-4 border-b">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <Clock className="w-4 h-4" />
              <span className="font-medium text-sm">
                {currentJob.status === 'accepted' && 'Travail accepté - Négociation en cours'}
                {currentJob.status === 'in_progress' && 'Travail en cours'}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <div className="text-lg">{currentJob.profession?.icon}</div>
              <div>
                <div className="font-medium text-gray-900">{currentJob.profession?.name_fr}</div>
                <div className="text-sm text-gray-600">{currentJob.client_name}</div>
              </div>
            </div>

            {(currentJob.status === 'accepted' || currentJob.status === 'in_progress') && (
              <button
                onClick={() => setShowChat(true)}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded font-medium hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-3 h-3" />
                Discuter
              </button>
            )}

            {currentJob.status === 'in_progress' && (
              <button
                onClick={() => completeJob(currentJob.id)}
                className="w-full bg-green-600 text-white py-2 px-3 rounded font-medium hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2 mt-2"
              >
                <CheckCircle className="w-3 h-3" />
                Travail terminé
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {showMap ? (
          <Map
            center={[professional.latitude, professional.longitude]}
            zoom={12}
            clientRequests={getFilteredRequests()}
            professionals={[professional]}
            onAcceptJob={(requestId) => startNegotiation(requestId)}
            onRequestNegotiation={(requestId) => startNegotiation(requestId)}
          />
        ) : (
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4">
              {selectedStatus === 'pending' && 'Demandes disponibles'}
              {selectedStatus === 'active' && 'Travaux en cours'}
              {selectedStatus === 'completed' && 'Travaux terminés'}
            </h3>
            {getFilteredRequests().length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-gray-600">Aucune demande disponible pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredRequests().map((request) => (
                  <div key={request.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{request.profession?.icon}</div>
                        <div>
                          <h4 className="font-bold text-gray-900">{request.profession?.name_fr}</h4>
                          <p className="text-sm text-gray-600">{request.client_name}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(request.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => startNegotiation(request.id)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accepter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showChat && currentJob && (
        <Chat
          jobRequestId={currentJob.id}
          currentUserName={professional.name}
          currentUserType="professional"
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}