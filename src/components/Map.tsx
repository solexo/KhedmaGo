import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { JobRequest, Professional } from '../lib/supabase';
import { MessageCircle } from 'lucide-react';

const carIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMyMmM1NWUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIi8+PHBhdGggZD0iTTMgOWgxOCIvPjxwYXRoIGQ9Ik05IDIxVjkiLz48L3N2Zz4=',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const pickupIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTA5OTY5IiBzdHJva2U9IiMwZjc2NTAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMTBjMCA2LTggMTItOCAxMnMtOC02LTgtMTJhOCA4IDAgMCAxIDE2IDBaIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyIvPjwvc3ZnPg==',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const dropoffIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjZWY0NDQ0IiBzdHJva2U9IiNiOTFjMWMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMTBjMCA2LTggMTItOCAxMnMtOC02LTgtMTJhOCA4IDAgMCAxIDE2IDBaIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyIvPjwvc3ZnPg==',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Client marker (green)
const clientIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTBiOTgxIiBzdHJva2U9IiMwNDc4NTciIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMTBjMCA2LTggMTItOCAxMnMtOC02LTgtMTJhOCA4IDAgMCAxIDE2IDBaIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyIvPjwvc3ZnPg==',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Professional marker (blue)
const professionalIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjM2I4MmY2IiBzdHJva2U9IiMxZTQwYWYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMTBjMCA2LTggMTItOCAxMnMtOC02LTgtMTJhOCA4IDAgMCAxIDE2IDBaIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMyIvPjwvc3ZnPg==',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

type DriverMarker = {
  id: string;
  position: LatLngExpression;
  name: string;
  vehicle: string;
  rating: number;
};

type MapProps = {
   drivers?: DriverMarker[];
   pickup?: LatLngExpression;
   dropoff?: LatLngExpression;
   clientRequests?: JobRequest[];
   professionals?: Professional[];
   clientLocation?: LatLngExpression | null;
   onMapClick?: (lat: number, lng: number) => void;
   center?: LatLngExpression;
   zoom?: number;
   onAcceptJob?: (requestId: string) => void;
   onRequestNegotiation?: (requestId: string) => void;
};

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export function Map({ drivers = [], pickup, dropoff, clientRequests = [], professionals = [], clientLocation, onMapClick, center, zoom = 13, onAcceptJob, onRequestNegotiation }: MapProps) {
  const defaultCenter: LatLngExpression = center || [33.5731, -7.5898];

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* Client location marker */}
        {clientLocation && (
           <Marker
             position={clientLocation}
             icon={clientIcon}
           >
             <Popup>
               <div className="text-center">
                 <div className="text-2xl mb-2">📍</div>
                 <div className="font-bold">Votre position</div>
                 <div className="text-sm text-gray-600">Vous êtes ici</div>
               </div>
             </Popup>
           </Marker>
         )}

        {/* Client request markers */}
        {clientRequests.map((request) => (
           <Marker
             key={request.id}
             position={[request.latitude, request.longitude]}
             icon={clientIcon}
           >
             <Popup>
               <div className="text-center">
                 <div className="text-2xl mb-2">{request.profession?.icon}</div>
                 <div className="font-bold">{request.profession?.name_fr}</div>
                 <div className="text-sm text-gray-600">{request.client_name}</div>
                 <div className="text-xs text-gray-500 mt-1">
                   {new Date(request.created_at).toLocaleTimeString()}
                 </div>
                 {onRequestNegotiation && (
                   <button
                     onClick={() => onRequestNegotiation(request.id)}
                     className="mt-2 w-full bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                   >
                     <MessageCircle className="w-3 h-3" />
                     Contacter
                   </button>
                 )}
               </div>
             </Popup>
           </Marker>
         ))}

        {/* Professional markers */}
        {professionals.map((professional) => (
          <Marker
            key={professional.id}
            position={[professional.latitude, professional.longitude]}
            icon={professionalIcon}
          >
            <Popup>
              <div className="text-center">
                <div className="text-2xl mb-2">{professional.profession?.icon}</div>
                <div className="font-bold">{professional.name}</div>
                <div className="text-sm text-gray-600">{professional.profession?.name_fr}</div>
                <div className={`text-xs px-2 py-1 rounded-full mt-1 ${
                  professional.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {professional.status === 'available' ? 'Disponible' : 'Indisponible'}
                </div>
                {onAcceptJob && (
                  <button
                    onClick={() => onAcceptJob(professional.id)}
                    className="mt-2 w-full bg-emerald-600 text-white py-1 px-3 rounded text-sm hover:bg-emerald-700"
                  >
                    Voir demandes
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Legacy driver markers */}
        {drivers.map((driver) => (
          <Marker
            key={driver.id}
            position={driver.position}
            icon={carIcon}
          >
            <Popup>
              <div>
                <strong>{driver.name}</strong><br />
                {driver.vehicle}<br />
                ⭐ {driver.rating}
              </div>
            </Popup>
          </Marker>
        ))}

        {pickup && (
          <Marker position={pickup} icon={pickupIcon}>
            <Popup>Point de départ</Popup>
          </Marker>
        )}

        {dropoff && (
          <Marker position={dropoff} icon={dropoffIcon}>
            <Popup>Point d'arrivée</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
