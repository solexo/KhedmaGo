import { useState, useEffect } from 'react';
import { MapPin, Navigation, DollarSign, Clock, Car } from 'lucide-react';
import { Map } from './Map';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Driver, DriverLocation, Ride } from '../lib/supabase';
import { LatLngExpression } from 'leaflet';

type VehicleType = 'economy' | 'comfort' | 'premium';

const vehicleOptions = [
  { type: 'economy' as VehicleType, name: 'Économie', priceMultiplier: 1, icon: '🚗' },
  { type: 'comfort' as VehicleType, name: 'Confort', priceMultiplier: 1.3, icon: '🚙' },
  { type: 'premium' as VehicleType, name: 'Premium', priceMultiplier: 1.6, icon: '🚘' },
];

export function RiderDashboard() {
  const { profile } = useAuth();
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('economy');
  const [isSelectingPickup, setIsSelectingPickup] = useState(true);
  const [availableDrivers, setAvailableDrivers] = useState<Array<Driver & { location: DriverLocation }>>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');

  useEffect(() => {
    loadAvailableDrivers();
    loadCurrentRide();

    const ridesSubscription = supabase
      .channel('driver_rides')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `rider_id=eq.${profile?.id}`,
        },
        async () => {
          const prevStatus = currentRide?.status;
          const newRide = await loadCurrentRide();
          if (newRide && prevStatus === 'requested' && newRide.status === 'accepted') {
            if ('Notification' in window) {
              if (Notification.permission === 'default') {
                await Notification.requestPermission();
              }
              if (Notification.permission === 'granted') {
                new Notification('Chauffeur trouvé!', {
                  body: `Votre chauffeur arrive.`,
                  icon: '/favicon.ico'
                });
              }
            }
          }
        }
      )
      .subscribe();

    const driversSubscription = supabase
      .channel('available_drivers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
        },
        () => {
          loadAvailableDrivers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers',
        },
        () => {
          loadAvailableDrivers();
        }
      )
      .subscribe();

    return () => {
      ridesSubscription.unsubscribe();
      driversSubscription.unsubscribe();
    };
  }, [profile?.id]);

  useEffect(() => {
    if (currentRide && currentRide.status === 'requested') {
      const interval = setInterval(() => {
        loadCurrentRide();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentRide]);

  async function loadAvailableDrivers() {
    try {
      const { data: drivers, error: driversError } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_available', true);

      if (driversError) throw driversError;

      if (drivers && drivers.length > 0) {
        const driverIds = drivers.map((d) => d.id);
        const { data: locations, error: locationsError } = await supabase
          .from('driver_locations')
          .select('*')
          .in('driver_id', driverIds);

        if (locationsError) throw locationsError;

        const driversWithLocations = drivers
          .map((driver) => {
            const location = locations?.find((l) => l.driver_id === driver.id);
            return location ? { ...driver, location } : null;
          })
          .filter((d): d is Driver & { location: DriverLocation } => d !== null);

        setAvailableDrivers(driversWithLocations);
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  }

  async function loadCurrentRide(): Promise<Ride | null> {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('rider_id', profile?.id)
        .in('status', ['requested', 'accepted', 'in_progress'])
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentRide(data);
      return data as Ride | null;
    } catch (error) {
      console.error('Error loading current ride:', error);
      return null;
    }
  }

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  async function handleMapClick(lat: number, lng: number) {
    const address = await reverseGeocode(lat, lng);
    if (isSelectingPickup) {
      setPickupLocation({ lat, lng });
      setPickupAddress(address);
      setIsSelectingPickup(false);
    } else {
      setDropoffLocation({ lat, lng });
      setDropoffAddress(address);
    }
  }

  function calculateEstimate() {
    if (!pickupLocation || !dropoffLocation) return { price: 0, duration: 0, distance: 0 };

    const R = 6371;
    const dLat = ((dropoffLocation.lat - pickupLocation.lat) * Math.PI) / 180;
    const dLng = ((dropoffLocation.lng - pickupLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pickupLocation.lat * Math.PI) / 180) *
        Math.cos((dropoffLocation.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const basePrice = 10;
    const pricePerKm = 5;
    const vehicleMultiplier = vehicleOptions.find((v) => v.type === selectedVehicle)?.priceMultiplier || 1;
    const price = (basePrice + distance * pricePerKm) * vehicleMultiplier;

    const avgSpeed = 40;
    const duration = (distance / avgSpeed) * 60;

    return { price: Math.round(price), duration: Math.round(duration), distance: distance.toFixed(1) };
  }

  async function requestRide() {
    if (!pickupLocation || !dropoffLocation || !profile) return;

    setLoading(true);
    try {
      const estimate = calculateEstimate();

      const { error } = await supabase.from('rides').insert({
        rider_id: profile.id,
        pickup_lat: pickupLocation.lat,
        pickup_lng: pickupLocation.lng,
        pickup_address: `${pickupLocation.lat.toFixed(4)}, ${pickupLocation.lng.toFixed(4)}`,
        dropoff_lat: dropoffLocation.lat,
        dropoff_lng: dropoffLocation.lng,
        dropoff_address: `${dropoffLocation.lat.toFixed(4)}, ${dropoffLocation.lng.toFixed(4)}`,
        vehicle_type: selectedVehicle,
        estimated_price: estimate.price,
        estimated_duration: estimate.duration,
        status: 'requested',
      });

      if (error) throw error;

      setPickupLocation(null);
      setDropoffLocation(null);
      await loadCurrentRide();
    } catch (error) {
      console.error('Error requesting ride:', error);
      alert('Failed to request ride. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function cancelRide() {
    if (!currentRide) return;

    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .eq('id', currentRide.id);

      if (error) throw error;
      setCurrentRide(null);
    } catch (error) {
      console.error('Error canceling ride:', error);
    }
  }

  const estimate = calculateEstimate();
  const canRequestRide = pickupLocation && dropoffLocation && !currentRide;

  const driverMarkers = availableDrivers.map((driver) => ({
    id: driver.id,
    position: [driver.location.latitude, driver.location.longitude] as LatLngExpression,
    name: `Driver ${driver.id.slice(0, 8)}`,
    vehicle: driver.vehicle_model,
    rating: driver.rating,
  }));

  if (currentRide) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-64 md:h-96 relative">
          <Map
            drivers={driverMarkers}
            pickup={[currentRide.pickup_lat, currentRide.pickup_lng]}
            dropoff={[currentRide.dropoff_lat, currentRide.dropoff_lng]}
            center={[currentRide.pickup_lat, currentRide.pickup_lng]}
          />
        </div>

        <div className="flex-1 bg-white p-4 md:p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-emerald-900 mb-2">
                {currentRide.status === 'requested' && 'Recherche de votre chauffeur...'}
                {currentRide.status === 'accepted' && 'Chauffeur en route'}
                {currentRide.status === 'in_progress' && 'Trajet en cours'}
              </h3>
              <p className="text-emerald-700">
                {currentRide.status === 'requested' &&
                  'Nous vous mettons en contact avec le meilleur chauffeur disponible'}
                {currentRide.status === 'accepted' && 'Votre chauffeur se dirige vers votre emplacement'}
                {currentRide.status === 'in_progress' && 'Profitez de votre trajet'}
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
                    <p className="text-sm text-gray-600">Prix estimé</p>
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

              {currentRide.status === 'requested' && (
                <button
                  onClick={cancelRide}
                  className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Annuler le trajet
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
      <div className="h-64 md:h-96 relative">
        <Map
          drivers={driverMarkers}
          pickup={pickupLocation ? [pickupLocation.lat, pickupLocation.lng] : undefined}
          dropoff={dropoffLocation ? [dropoffLocation.lat, dropoffLocation.lng] : undefined}
          onMapClick={handleMapClick}
          center={[33.5731, -7.5898]}
        />
      </div>

      <div className="flex-1 bg-white p-4 md:p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-emerald-800">
              {isSelectingPickup
                ? '📍 Appuyez sur la carte pour sélectionner votre point de départ'
                : '📍 Appuyez sur la carte pour sélectionner votre destination'}
            </p>
          </div>

          <div className="space-y-3 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse de départ</label>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Entrez l'adresse de départ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse de destination</label>
              <input
                type="text"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Entrez l'adresse de destination"
              />
            </div>
          </div>

          {pickupLocation && (
            <button
              onClick={() => setIsSelectingPickup(!isSelectingPickup)}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {isSelectingPickup ? 'Modifier la destination' : 'Modifier le point de départ'}
            </button>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Sélectionner le type de véhicule</h3>
            <div className="grid grid-cols-3 gap-3">
              {vehicleOptions.map((vehicle) => (
                <button
                  key={vehicle.type}
                  onClick={() => setSelectedVehicle(vehicle.type)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedVehicle === vehicle.type
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-3xl mb-2">{vehicle.icon}</div>
                  <p className="font-medium text-sm">{vehicle.name}</p>
                </button>
              ))}
            </div>
          </div>

          {pickupLocation && dropoffLocation && (
            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">Prix estimé</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{estimate.price} MAD</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">Durée estimée</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{estimate.duration} min</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">Distance</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{estimate.distance} km</span>
              </div>
            </div>
          )}

          <button
            onClick={requestRide}
            disabled={!canRequestRide || loading}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Car className="w-6 h-6" />
            {loading ? 'Demande en cours...' : 'Demander un trajet'}
          </button>
        </div>
      </div>
    </div>
  );
}
