import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Hospital, Stethoscope, Pill, Search, Loader, Phone, Globe, Clock, Building2 } from 'lucide-react';

const MedicalFacilitiesFinder = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [medicalFacilities, setMedicalFacilities] = useState({
    hospitals: [],
    clinics: [],
    dispensaries: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [radius, setRadius] = useState(5);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Initialize Leaflet map
  useEffect(() => {
    const loadLeaflet = async () => {
      if (!window.L) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(cssLink);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.head.appendChild(script);

        return new Promise((resolve) => {
          script.onload = resolve;
        });
      }
    };

    loadLeaflet().then(() => {
      if (mapRef.current && !mapInstanceRef.current) {
        mapInstanceRef.current = window.L.map(mapRef.current).setView([26.8467, 80.9462], 13);
        
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstanceRef.current);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Get user's current location
  const getCurrentLocation = () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([location.lat, location.lng], 15);
        }
        
        fetchMedicalFacilities(location.lat, location.lng);
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        setLoading(false);
      }
    );
  };

  // Fetch medical facilities from API
  const fetchMedicalFacilities = async (lat, lng) => {
    try {
      const response = await fetch(`/api/nearby-medical?lat=${lat}&lng=${lng}&radius=${radius}`);
      const data = await response.json();
      
      if (data.success) {
        setMedicalFacilities(data.medical_facilities);
        updateMapMarkers(data.medical_facilities, { lat, lng });
      } else {
        setError('Failed to fetch medical facilities');
      }
    } catch (err) {
      setError('Error fetching data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update map markers
  const updateMapMarkers = (facilities, userLoc) => {
    if (!mapInstanceRef.current || !window.L) return;

    markersRef.current.forEach(marker => mapInstanceRef.current.removeLayer(marker));
    markersRef.current = [];

    const userMarker = window.L.marker([userLoc.lat, userLoc.lng])
      .addTo(mapInstanceRef.current)
      .bindPopup('Your Location')
      .openPopup();
    markersRef.current.push(userMarker);

    const markerConfigs = {
      hospitals: { color: '#dc2626', icon: '🏥' },
      clinics: { color: '#2563eb', icon: '🩺' },
      dispensaries: { color: '#16a34a', icon: '💊' }
    };

    Object.entries(facilities).forEach(([category, items]) => {
      const config = markerConfigs[category];
      items.forEach(facility => {
        if (facility.lat && facility.lng) {
          const customIcon = window.L.divIcon({
            html: `<div style="background-color: ${config.color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${config.icon}</div>`,
            className: 'custom-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          const marker = window.L.marker([facility.lat, facility.lng], { icon: customIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`
              <div style="min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; color: ${config.color};">${facility.name}</h3>
                <p style="margin: 4px 0; color: #666; font-size: 13px; text-transform: capitalize;"><strong>Type:</strong> ${facility.type}</p>
                <p style="margin: 4px 0;"><strong>Address:</strong> ${facility.address}</p>
                <p style="margin: 4px 0;"><strong>Phone:</strong> ${facility.phone}</p>
                <p style="margin: 4px 0;"><strong>Hours:</strong> ${facility.opening_hours}</p>
                ${facility.emergency ? `<p style="margin: 4px 0; color: red;"><strong>Emergency:</strong> Available</p>` : ''}
                ${facility.website ? `<p style="margin: 4px 0;"><a href="${facility.website}" target="_blank">Visit Website</a></p>` : ''}
              </div>
            `);
          
          marker.on('click', () => setSelectedFacility(facility));
          markersRef.current.push(marker);
        }
      });
    });
  };

  // Filter facilities based on active tab
  const getFilteredFacilities = () => {
    if (activeTab === 'all') {
      return [
        ...medicalFacilities.hospitals.map(f => ({ ...f, category: 'hospital' })),
        ...medicalFacilities.clinics.map(f => ({ ...f, category: 'clinic' })),
        ...medicalFacilities.dispensaries.map(f => ({ ...f, category: 'dispensary' }))
      ];
    }
    return medicalFacilities[activeTab]?.map(f => ({ ...f, category: activeTab.slice(0, -1) })) || [];
  };

  const getTypeIcon = (category) => {
    switch (category) {
      case 'hospital': return <Hospital className="w-4 h-4 text-red-600" />;
      case 'clinic': return <Stethoscope className="w-4 h-4 text-blue-600" />;
      case 'dispensary': return <Pill className="w-4 h-4 text-green-600" />;
      default: return <Building2 className="w-4 h-4" />;
    }
  };

  const getTypeColor = (category) => {
    switch (category) {
      case 'hospital': return 'border-red-200 bg-red-50';
      case 'clinic': return 'border-blue-200 bg-blue-50';
      case 'dispensary': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getTotalCount = () => {
    return medicalFacilities.hospitals.length + medicalFacilities.clinics.length + medicalFacilities.dispensaries.length;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Hospital className="w-6 h-6 text-red-600" />
            Medical Facilities Finder
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Radius:</label>
              <select 
                value={radius} 
                onChange={(e) => setRadius(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={1}>1 km</option>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
              </select>
            </div>
            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Find Medical Facilities
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All', icon: MapPin, count: getTotalCount() },
            { key: 'hospitals', label: 'Hospitals', icon: Hospital, count: medicalFacilities.hospitals.length },
            { key: 'clinics', label: 'Clinics', icon: Stethoscope, count: medicalFacilities.clinics.length },
            { key: 'dispensaries', label: 'Dispensaries', icon: Pill, count: medicalFacilities.dispensaries.length }
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === key
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 mt-2 rounded">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1">
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">
              {activeTab === 'all' ? 'All Medical Facilities' : 
               activeTab === 'hospitals' ? 'Hospitals' :
               activeTab === 'clinics' ? 'Clinics' : 'Dispensaries & Pharmacies'}
              {getFilteredFacilities().length > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  ({getFilteredFacilities().length} found)
                </span>
              )}
            </h2>

            {getFilteredFacilities().length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Hospital className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{userLocation ? 'No medical facilities found in the selected area.' : 'Click "Find Medical Facilities" to start searching.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getFilteredFacilities().map((facility, index) => (
                  <div
                    key={`${facility.category}-${facility.id}-${index}`}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${getTypeColor(facility.category)} ${
                      selectedFacility?.id === facility.id ? 'ring-2 ring-red-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedFacility(facility);
                      if (mapInstanceRef.current && facility.lat && facility.lng) {
                        mapInstanceRef.current.setView([facility.lat, facility.lng], 16);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {getTypeIcon(facility.category)}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{facility.name}</h3>
                        <p className="text-xs text-gray-500 capitalize mb-1">{facility.category}</p>
                        <p className="text-sm text-gray-600">{facility.address}</p>
                        
                        <div className="flex flex-col gap-1 mt-2 text-xs text-gray-500">
                          {facility.phone !== 'Phone not available' && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span className="truncate">{facility.phone}</span>
                            </div>
                          )}
                          
                          {facility.opening_hours !== 'Hours not available' && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span className="truncate">{facility.opening_hours}</span>
                            </div>
                          )}
                          
                          {facility.emergency && (
                            <div className="text-red-600 font-medium">
                              Emergency Services Available
                            </div>
                          )}
                          
                          {facility.website && (
                            <div className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              <a 
                                href={facility.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Visit Website
                              </a>
                            </div>
                          )}
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
    </div>
  );
};

export default MedicalFacilitiesFinder;