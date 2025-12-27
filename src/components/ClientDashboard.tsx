import { useState, useEffect } from 'react';
import { supabase, Profession, Professional } from '../lib/supabase';
import { Phone, MessageCircle, MapPin, Search } from 'lucide-react';

export function ClientDashboard() {
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [selectedProfession, setSelectedProfession] = useState<string>('');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProfessions();
  }, []);

  useEffect(() => {
    if (selectedProfession) {
      loadProfessionals();
    } else {
      setProfessionals([]);
    }
  }, [selectedProfession]);

  async function loadProfessions() {
    try {
      const { data, error } = await supabase
        .from('professions')
        .select('*')
        .order('name_fr');

      if (error) throw error;
      setProfessions(data || []);
    } catch (error) {
      console.error('Error loading professions:', error);
    }
  }

  async function loadProfessionals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('*, profession:professions(*)')
        .eq('profession_id', selectedProfession)
        .eq('is_available', true);

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error('Error loading professionals:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProfessionals = professionals.filter(pro =>
    pro.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pro.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Trouver un professionnel</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sélectionnez une profession
        </label>
        <select
          value={selectedProfession}
          onChange={(e) => setSelectedProfession(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="">Toutes les professions</option>
          {professions.map((profession) => (
            <option key={profession.id} value={profession.id}>
              {profession.icon} {profession.name_fr}
            </option>
          ))}
        </select>
      </div>

      {selectedProfession && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des professionnels...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfessionals.map((professional) => (
            <div key={professional.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <img
                  src={professional.photo_url || 'https://via.placeholder.com/64x64?text=👤'}
                  alt={professional.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-100"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{professional.name}</h3>
                  <p className="text-emerald-600 font-medium">{professional.profession?.name_fr}</p>
                  <div className="flex items-center gap-1 text-gray-600 text-sm mt-1">
                    <MapPin className="w-4 h-4" />
                    {professional.city}
                  </div>
                </div>
              </div>
              <p className="text-gray-700 text-sm mt-3">
                {professional.description_fr || 'Aucune description disponible'}
              </p>
              <div className="flex gap-2 mt-4">
                <a
                  href={`tel:${professional.phone}`}
                  className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg text-center font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Appeler
                </a>
                {professional.whatsapp && (
                  <a
                    href={`https://wa.me/${professional.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-center font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && selectedProfession && filteredProfessionals.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">Aucun professionnel trouvé pour cette profession.</p>
        </div>
      )}
    </div>
  );
}