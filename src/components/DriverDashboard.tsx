import { useState, useEffect } from 'react';
import { MapPin, Navigation, DollarSign, Clock, Power, Check, X } from 'lucide-react';
import { Map } from './Map';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Driver, Ride } from '../lib/supabase';
import { LatLngExpression } from 'leaflet';

export function DriverDashboard() {
  const { profile } = useAuth();
  const [driverInfo, setDriverInfo] = useState<Driver | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDriverInfo();
    getCurrentLocation();

    const ridesSubscription = supabase
      .channel('driver_rides')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
        },
        () => {
          loadAvailableRides();
          loadCurrentRide();
        }
      )
      .subscribe();

    return () => {
      ridesSubscription.unsubscribe();
    };
  }, [profile?.id]);

  useEffect(() => {
    if (isAvailable) {
      loadAvailableRides();
      const interval = setInterval(loadAvailableRides, 5000);
      return () => clearInterval(interval);
    }
  }, [isAvailable]);

  async function loadDriverInfo() {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', profile?.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setDriverInfo(data);
        setIsAvailable(data.is_available);
      }
    } catch (error) {
      console.error('Error loading driver info:', error);
    }
  }

  async function loadAvailableRides() {
    if (!isAvailable) return;

    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'requested')
        .order('requested_at', { ascending: true });

      if (error) throw error;
      setAvailableRides(data || []);
    } catch (error) {
      console.error('Error loading rides:', error);
    }
  }

  async function loadCurrentRide() {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', profile?.id)
        .in('status', ['accepted', 'in_progress'])
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentRide(data);
    } catch (error) {
      console.error('Error loading current ride:', error);
    }
  }

  function getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(location);
          updateDriverLocation(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          setCurrentLocation({ lat: 33.5731, lng: -7.5898 });
        }
      );
    } else {
      setCurrentLocation({ lat: 33.5731, lng: -7.5898 });
    }
  }

  async function updateDriverLocation(location: { lat: number; lng: number }) {
    if (!profile?.id) return;

    try {
      const { error } = await supabase.from('driver_locations').upsert({
        driver_id: profile.id,
        latitude: location.lat,
        longitude: location.lng,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'driver_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  async function toggleAvailability() {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const newStatus = !isAvailable;
      const { error } = await supabase
        .from('drivers')
        .update({ is_available: newStatus })
        .eq('id', profile.id);

      if (error) throw error;
      setIsAvailable(newStatus);

      if (newStatus && currentLocation) {
        await updateDriverLocation(currentLocation);
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
    } finally {
      setLoading(false);
    }
  }

  async function acceptRide(rideId: string) {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          driver_id: profile.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', rideId)
        .eq('status', 'requested');

      if (error) throw error;
      await loadCurrentRide();
      await loadAvailableRides();
    } catch (error) {
      console.error('Error accepting ride:', error);
      alert('Failed to accept ride. It may have been taken by another driver.');
    } finally {
      setLoading(false);
    }
  }

  async function startRide() {
    if (!currentRide) return;

    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', currentRide.id);

      if (error) throw error;
      await loadCurrentRide();
    } catch (error) {
      console.error('Error starting ride:', error);
    }
  }

  async function completeRide() {
    if (!currentRide) return;

    try {
      const { error: rideError } = await supabase
        .from('rides')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          final_price: currentRide.estimated_price,
        })
        .eq('id', currentRide.id);

      if (rideError) throw rideError;

      const { error: driverError } = await supabase
        .from('drivers')
        .update({
          total_rides: (driverInfo?.total_rides || 0) + 1,
        })
        .eq('id', profile?.id);

      if (driverError) throw driverError;

      setCurrentRide(null);
      await loadDriverInfo();
    } catch (error) {
      console.error('Error completing ride:', error);
    }
  }

  if (!driverInfo) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Chargement des informations du chauffeur...</p>
        </div>
      </div>
    );
  }

  if (currentRide) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-64 md:h-96 relative">
          <Map
            pickup={[currentRide.pickup_lat, currentRide.pickup_lng]}
            dropoff={[currentRide.dropoff_lat, currentRide.dropoff_lng]}
            center={
              currentRide.status === 'accepted'
                ? [currentRide.pickup_lat, currentRide.pickup_lng]
                : currentLocation
                ? [currentLocation.lat, currentLocation.lng]
                : undefined
            }
          />
        </div>

        <div className="flex-1 bg-white p-4 md:p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-blue-900 mb-2">
                {currentRide.status === 'accepted' && 'Naviguez jusqu\'au point de départ'}
                {currentRide.status === 'in_progress' && 'Naviguez jusqu\'à la destination'}
              </h3>
              <p className="text-blue-700">
                {currentRide.status === 'accepted' && 'Récupérez votre passager'}
                {currentRide.status === 'in_progress' && 'Destination à proximité'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Départ</p>
                  <p className="text-sm text-gray-600">{currentRide.pickup_address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Navigation className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Destination</p>
                  <p className="text-sm text-gray-600">{currentRide.dropoff_address}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-gray-600" />
                    <p className="text-sm text-gray-600">Tarif</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{currentRide.estimated_price} MAD</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <p className="text-sm text-gray-600">Durée</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{currentRide.estimated_duration} min</p>
                </div>
              </div>

              {currentRide.status === 'accepted' && (
                <button
                  onClick={startRide}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  Commencer le trajet
                </button>
              )}

              {currentRide.status === 'in_progress' && (
                <button
                  onClick={completeRide}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                >
                  Terminer le trajet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b shadow-sm p-3 md:p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="bg-blue-100 p-2 md:p-3 rounded-xl">
              <p className="text-xl md:text-2xl">🚗</p>
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">
                {driverInfo.vehicle_model} - {driverInfo.vehicle_plate}
              </h2>
              <p className="text-sm text-gray-600">
                {driverInfo.total_rides} trajets • ⭐ {driverInfo.rating.toFixed(1)}
              </p>
            </div>
          </div>

          <button
            onClick={toggleAvailability}
            disabled={loading}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-colors text-sm md:text-base ${
              isAvailable
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <Power className="w-4 md:w-5 h-4 md:h-5" />
            {isAvailable ? 'Se déconnecter' : 'Se connecter'}
          </button>
        </div>
      </div>

      {!isAvailable ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="bg-gray-200 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
              <Power className="w-12 h-12 text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Vous êtes hors ligne</h3>
            <p className="text-gray-600 mb-6">Connectez-vous pour commencer à accepter des trajets</p>
          </div>
        </div>
      ) : availableRides.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="bg-emerald-100 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
              <Check className="w-12 h-12 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Vous êtes en ligne</h3>
            <p className="text-gray-600">En attente de demandes de trajets...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
              Trajets disponibles ({availableRides.length})
            </h3>

            <div className="space-y-3 md:space-y-4">
              {availableRides.map((ride) => {
                const distance =
                  currentLocation
                    ? Math.sqrt(
                        Math.pow(ride.pickup_lat - currentLocation.lat, 2) +
                          Math.pow(ride.pickup_lng - currentLocation.lng, 2)
                      ) * 111
                    : 0;

                return (
                  <div
                    key={ride.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                      <div className="flex-1 mb-4 md:mb-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="px-2 md:px-3 py-1 bg-blue-100 text-blue-700 text-xs md:text-sm font-semibold rounded-full">
                            {ride.vehicle_type}
                          </span>
                          {currentLocation && (
                            <span className="text-xs md:text-sm text-gray-600">
                              à {distance.toFixed(1)} km
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700">{ride.pickup_address}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Navigation className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700">{ride.dropoff_address}</p>
                          </div>
                        </div>
                      </div>

                      <div className="text-left md:text-right md:ml-4">
                        <p className="text-2xl md:text-3xl font-bold text-emerald-600">
                          {ride.estimated_price} MAD
                        </p>
                        <p className="text-sm text-gray-600">{ride.estimated_duration} min</p>
                      </div>
                    </div>

                    <button
                      onClick={() => acceptRide(ride.id)}
                      disabled={loading}
                      className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                    >
                      Accepter le trajet
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
