import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Professional } from '../lib/supabase';
import { Phone, MapPin, ToggleLeft, ToggleRight, Edit } from 'lucide-react';

export function ProfessionalDashboard() {
  const { user } = useAuth();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfessional();
    }
  }, [user]);

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

  async function toggleAvailability() {
    if (!professional) return;
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ is_available: !professional.is_available })
        .eq('id', professional.id);

      if (error) throw error;
      setProfessional({ ...professional, is_available: !professional.is_available });
    } catch (error) {
      console.error('Error updating availability:', error);
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
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Mon profil professionnel</h2>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-start gap-6">
          <img
            src={professional.photo_url || 'https://via.placeholder.com/128x128?text=👤'}
            alt={professional.name}
            className="w-32 h-32 rounded-full object-cover border-4 border-emerald-100"
          />
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-gray-900">{professional.name}</h3>
            <p className="text-emerald-600 text-xl font-medium mt-1">{professional.profession?.name_fr}</p>
            <div className="flex items-center gap-2 text-gray-600 mt-2">
              <MapPin className="w-5 h-5" />
              <span>{professional.city}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 mt-1">
              <Phone className="w-5 h-5" />
              <span>{professional.phone}</span>
            </div>
            <div className="mt-4">
              <p className="text-gray-700">{professional.description_fr || 'Aucune description'}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={toggleAvailability}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                professional.is_available
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {professional.is_available ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {professional.is_available ? 'Disponible' : 'Indisponible'}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
              <Edit className="w-5 h-5" />
              Modifier le profil
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">Statistiques</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">0</div>
            <div className="text-gray-600">Demandes reçues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">0</div>
            <div className="text-gray-600">Demandes acceptées</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">0</div>
            <div className="text-gray-600">Avis clients</div>
          </div>
        </div>
      </div>
    </div>
  );
}