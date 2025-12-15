import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profession } from '../lib/supabase';
import { MapPin, Upload, Phone, MessageCircle } from 'lucide-react';

interface ProfessionalSetupProps {
  onComplete: () => void;
}

export function ProfessionalSetup({ onComplete }: ProfessionalSetupProps) {
  const { user } = useAuth();
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    profession_id: '',
    custom_profession: '',
    name: '',
    phone: '',
    whatsapp: '',
    description_fr: '',
    description_ar: '',
    city: '',
    latitude: 0,
    longitude: 0,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  useEffect(() => {
    loadProfessions();
    getCurrentLocation();
  }, []);

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

  function getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to Casablanca
          setFormData(prev => ({
            ...prev,
            latitude: 33.5731,
            longitude: -7.5898,
          }));
        }
      );
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      let finalProfessionId = formData.profession_id;
      let photoUrl = '';

      // Handle custom profession
      if (formData.profession_id === professions.find(p => p.name_fr === 'Autre')?.id) {
        if (!formData.custom_profession.trim()) {
          alert('Veuillez spécifier votre profession');
          return;
        }

        // Create new profession
        const { data: newProfession, error: professionError } = await supabase
          .from('professions')
          .insert({
            name_fr: formData.custom_profession,
            name_ar: formData.custom_profession, // For now, same as French
            icon: '💼'
          })
          .select()
          .single();

        if (professionError) throw professionError;
        finalProfessionId = newProfession.id;
      }

      // Upload photo if provided
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('professional-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('professional-photos')
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
      }

      // Create professional profile
      const { error } = await supabase
        .from('professionals')
        .insert({
          id: user.id,
          profession_id: finalProfessionId,
          name: formData.name,
          phone: formData.phone,
          photo_url: photoUrl,
          description_fr: formData.description_fr,
          description_ar: formData.description_ar,
          city: formData.city,
          latitude: formData.latitude,
          longitude: formData.longitude,
          is_available: true,
        });

      if (error) throw error;

      onComplete();
    } catch (error) {
      console.error('Error creating professional profile:', error);
      alert('Erreur lors de la création du profil professionnel');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
        <div className="text-center mb-8">
          <div className="bg-emerald-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔧</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Configuration Professionnel</h2>
          <p className="text-gray-600">Complétez votre profil pour commencer à recevoir des demandes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profession Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profession *
            </label>
            <select
              value={formData.profession_id}
              onChange={(e) => setFormData(prev => ({ ...prev, profession_id: e.target.value, custom_profession: '' }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            >
              <option value="">Sélectionnez une profession</option>
              {professions.map((profession) => (
                <option key={profession.id} value={profession.id}>
                  {profession.icon} {profession.name_fr}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Profession Input (when "Autre" is selected) */}
          {formData.profession_id === professions.find(p => p.name_fr === 'Autre')?.id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spécifiez votre profession *
              </label>
              <input
                type="text"
                value={formData.custom_profession}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_profession: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ex: Consultant IT, Designer..."
                required
              />
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom complet *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de téléphone *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="+212 6XX XXX XXX"
                required
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp (optionnel)
            </label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="+212 6XX XXX XXX"
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ville *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ex: Casablanca, Rabat..."
                required
              />
            </div>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Français)
              </label>
              <textarea
                value={formData.description_fr}
                onChange={(e) => setFormData(prev => ({ ...prev, description_fr: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={3}
                placeholder="Décrivez vos services..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (العربية)
              </label>
              <textarea
                value={formData.description_ar}
                onChange={(e) => setFormData(prev => ({ ...prev, description_ar: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={3}
                placeholder="وصف خدماتك..."
                dir="rtl"
              />
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo de profil (optionnel)
            </label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-emerald-500 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
              </div>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg border"
                />
              )}
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              📍 Votre position sera automatiquement détectée. Latitude: {formData.latitude.toFixed(4)}, Longitude: {formData.longitude.toFixed(4)}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Création du profil...' : 'Créer mon profil professionnel'}
          </button>
        </form>
      </div>
    </div>
  );
}