import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Car } from 'lucide-react';

type VehicleType = 'economy' | 'comfort' | 'premium';

export function DriverSetup({ onComplete }: { onComplete: () => void }) {
  const { profile } = useAuth();
  const [vehicleType, setVehicleType] = useState<VehicleType>('economy');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!profile?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      const { error: insertError } = await supabase.from('drivers').insert({
        id: profile.id,
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel,
        vehicle_plate: vehiclePlate,
        license_number: licenseNumber,
      });

      if (insertError) throw insertError;

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur s\'est produite');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl">
            <Car className="w-8 h-8 text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Complétez votre profil de chauffeur
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Parlez-nous de votre véhicule pour commencer à accepter des trajets
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type de véhicule
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setVehicleType('economy')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  vehicleType === 'economy'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-1">🚗</div>
                <span className="text-sm font-medium">Économie</span>
              </button>
              <button
                type="button"
                onClick={() => setVehicleType('comfort')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  vehicleType === 'comfort'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-1">🚙</div>
                <span className="text-sm font-medium">Confort</span>
              </button>
              <button
                type="button"
                onClick={() => setVehicleType('premium')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  vehicleType === 'premium'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-1">🚘</div>
                <span className="text-sm font-medium">Premium</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modèle du véhicule
            </label>
            <input
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="ex. Toyota Corolla 2020"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro d'immatriculation
            </label>
            <input
              type="text"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
              placeholder="ex. 12345-A-67"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Numéro de permis de conduire
            </label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="Entrez votre numéro de permis"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Configuration en cours...' : 'Terminer la configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}
