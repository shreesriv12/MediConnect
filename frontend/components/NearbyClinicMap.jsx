import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Hospital, Stethoscope, Pill, Search, Loader, Phone, Globe, Clock, Building2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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
  const [isRadiusOpen, setIsRadiusOpen] = useState(false);
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

  // Map navigation functions
  const panMap = (direction) => {
    if (!mapInstanceRef.current) return;
    
    const panAmount = 0.01;
    const center = mapInstanceRef.current.getCenter();
    
    switch (direction) {
      case 'up':
        mapInstanceRef.current.panTo([center.lat + panAmount, center.lng]);
        break;
      case 'down':
        mapInstanceRef.current.panTo([center.lat - panAmount, center.lng]);
        break;
      case 'left':
        mapInstanceRef.current.panTo([center.lat, center.lng - panAmount]);
        break;
      case 'right':
        mapInstanceRef.current.panTo([center.lat, center.lng + panAmount]);
        break;
    }
  };

  const zoomMap = (direction) => {
    if (!mapInstanceRef.current) return;
    
    if (direction === 'in') {
      mapInstanceRef.current.zoomIn();
    } else {
      mapInstanceRef.current.zoomOut();
    }
  };

  const resetMapView = () => {
    if (!mapInstanceRef.current) return;
    
    if (userLocation) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15);
    } else {
      mapInstanceRef.current.setView([26.8467, 80.9462], 13);
    }
  };

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
        
        // Fetch based on active tab
        if (activeTab === 'all') {
          fetchAllMedicalFacilities(location.lat, location.lng);
        } else {
          fetchSpecificFacilities(location.lat, location.lng, activeTab);
        }
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        setLoading(false);
      }
    );
  };

  // Fetch all medical facilities from API
  const fetchAllMedicalFacilities = async (lat, lng) => {
    try {
      const response = await fetch(`http://localhost:5000/clinics/nearby-medical?lat=${lat}&lng=${lng}&radius=${radius}`);
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

  // Fetch specific type of facilities
  const fetchSpecificFacilities = async (lat, lng, type) => {
    try {
      let endpoint = '';
      switch (type) {
        case 'hospitals':
          endpoint = 'nearby-hospitals';
          break;
        case 'clinics':
          endpoint = 'nearby-clinics';
          break;
        case 'dispensaries':
          endpoint = 'nearby-dispensaries';
          break;
        default:
          endpoint = 'nearby-medical';
      }

      const response = await fetch(`http://localhost:5000/clinics/${endpoint}?lat=${lat}&lng=${lng}&radius=${radius}`);
      const data = await response.json();
      
      if (data.success) {
        // Reset facilities state
        const resetFacilities = {
          hospitals: [],
          clinics: [],
          dispensaries: []
        };

        // Populate the specific type
        if (data.hospitals) {
          resetFacilities.hospitals = data.hospitals.map(f => ({ ...f, type: 'hospital' }));
        }
        if (data.clinics) {
          resetFacilities.clinics = data.clinics.map(f => ({ ...f, type: 'clinic' }));
        }
        if (data.dispensaries) {
          resetFacilities.dispensaries = data.dispensaries.map(f => ({ ...f, type: 'dispensary' }));
        }
        
        // Handle the case where all facilities are returned (nearby-medical endpoint)
        if (data.medical_facilities) {
          setMedicalFacilities(data.medical_facilities);
          updateMapMarkers(data.medical_facilities, { lat, lng });
        } else {
          setMedicalFacilities(resetFacilities);
          updateMapMarkers(resetFacilities, { lat, lng });
        }
      } else {
        setError(`Failed to fetch ${type}`);
      }
    } catch (err) {
      setError('Error fetching data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (userLocation) {
      setLoading(true);
      if (newTab === 'all') {
        fetchAllMedicalFacilities(userLocation.lat, userLocation.lng);
      } else {
        fetchSpecificFacilities(userLocation.lat, userLocation.lng, newTab);
      }
    }
  };

  // Handle radius change
  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    setIsRadiusOpen(false);
    
    // Re-fetch data with new radius if location is available
    if (userLocation) {
      setLoading(true);
      if (activeTab === 'all') {
        fetchAllMedicalFacilities(userLocation.lat, userLocation.lng);
      } else {
        fetchSpecificFacilities(userLocation.lat, userLocation.lng, activeTab);
      }
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
      if (!config) return;
      
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
                <p style="margin: 4px 0; color: #666; font-size: 13px; text-transform: capitalize;"><strong>Type:</strong> ${facility.type || category.slice(0, -1)}</p>
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
      case 'hospital': return 'border-red-200 bg-red-50 hover:bg-red-100';
      case 'clinic': return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
      case 'dispensary': return 'border-green-200 bg-green-50 hover:bg-green-100';
      default: return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  const getTotalCount = () => {
    return medicalFacilities.hospitals.length + medicalFacilities.clinics.length + medicalFacilities.dispensaries.length;
  };

  const radiusOptions = [
    { value: 1, label: '1 km' },
    { value: 2, label: '2 km' },
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 15, label: '15 km' },
    { value: 20, label: '20 km' },
    { value: 25, label: '25 km' }
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <div className="bg-white shadow-xl border-b border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Hospital className="w-8 h-8 text-red-600" />
              </div>
              Medical Facilities Finder
            </h1>
            <div className="flex items-center gap-6">
              {/* Enhanced Radius Selector */}
              <div className="relative">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Search Radius:</label>
                <div className="relative">
                  <button
                    onClick={() => setIsRadiusOpen(!isRadiusOpen)}
                    className="w-32 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-between hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <span className="font-medium">{radius} km</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isRadiusOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isRadiusOpen && (
                    <div className="absolute top-full left-0 mt-1 w-32 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {radiusOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleRadiusChange(option.value)}
                          className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors ${
                            radius === option.value ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Search Button */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2 opacity-0">Search:</label>
                <button
                  onClick={getCurrentLocation}
                  disabled={loading}
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2 rounded-lg flex items-center gap-3 hover:from-red-700 hover:to-red-800 disabled:opacity-50 shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  <span className="font-medium">Find Facilities</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Tabs */}
          <div className="flex gap-3">
            {[
              { key: 'all', label: 'All Facilities', icon: MapPin, count: getTotalCount(), color: 'purple' },
              { key: 'hospitals', label: 'Hospitals', icon: Hospital, count: medicalFacilities.hospitals.length, color: 'red' },
              { key: 'clinics', label: 'Clinics', icon: Stethoscope, count: medicalFacilities.clinics.length, color: 'blue' },
              { key: 'dispensaries', label: 'Pharmacies', icon: Pill, count: medicalFacilities.dispensaries.length, color: 'green' }
            ].map(({ key, label, icon: Icon, count, color }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`px-6 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 transform hover:scale-105 ${
                  activeTab === key
                    ? `bg-gradient-to-r ${
                        color === 'purple' ? 'from-purple-600 to-purple-700' :
                        color === 'red' ? 'from-red-600 to-red-700' :
                        color === 'blue' ? 'from-blue-600 to-blue-700' :
                        'from-green-600 to-green-700'
                      } text-white shadow-lg`
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
                {count > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    activeTab === key ? 'bg-white bg-opacity-30' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-6 py-4 mx-6 mt-4 rounded-r-lg shadow-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4">
        {/* Enhanced Map Container */}
        <div className="flex-1 relative bg-white rounded-2xl shadow-xl overflow-hidden">
          <div ref={mapRef} className="w-full h-full" />
          
          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {/* Zoom Controls */}
            <div className="bg-white rounded-lg shadow-lg p-1">
              <button
                onClick={() => zoomMap('in')}
                className="block p-2 hover:bg-gray-100 rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => zoomMap('out')}
                className="block p-2 hover:bg-gray-100 rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Navigation Controls */}
            <div className="bg-white rounded-lg shadow-lg p-1">
              <div className="grid grid-cols-3 gap-1">
                <div></div>
                <button
                  onClick={() => panMap('up')}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Pan Up"
                >
                  <ChevronUp className="w-5 h-5 text-gray-700" />
                </button>
                <div></div>
                <button
                  onClick={() => panMap('left')}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Pan Left"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={resetMapView}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Reset View"
                >
                  <RotateCcw className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => panMap('right')}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Pan Right"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
                <div></div>
                <button
                  onClick={() => panMap('down')}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Pan Down"
                >
                  <ChevronDown className="w-5 h-5 text-gray-700" />
                </button>
                <div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Sidebar */}
        <div className="w-96 bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {activeTab === 'all' ? 'All Medical Facilities' : 
                 activeTab === 'hospitals' ? 'Hospitals' :
                 activeTab === 'clinics' ? 'Clinics' : 'Pharmacies'}
              </h2>
              {getFilteredFacilities().length > 0 && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                  {getFilteredFacilities().length} found
                </span>
              )}
            </div>

            <div className="h-[calc(100vh-300px)] overflow-y-auto pr-2 -mr-2">
              {getFilteredFacilities().length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Hospital className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium mb-2">No facilities found</p>
                  <p className="text-sm">{userLocation ? 'Try expanding your search radius or changing the location.' : 'Click "Find Facilities" to start searching for medical facilities near you.'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredFacilities().map((facility, index) => (
                    <div
                      key={`${facility.category}-${facility.id}-${index}`}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-102 ${getTypeColor(facility.category)} ${
                        selectedFacility?.id === facility.id ? 'ring-4 ring-blue-300 shadow-lg scale-102' : ''
                      }`}
                      onClick={() => {
                        setSelectedFacility(facility);
                        if (mapInstanceRef.current && facility.lat && facility.lng) {
                          mapInstanceRef.current.setView([facility.lat, facility.lng], 16);
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                          {getTypeIcon(facility.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-lg mb-1">{facility.name}</h3>
                          <p className="text-sm text-gray-600 capitalize font-medium mb-2 bg-white px-2 py-1 rounded-md inline-block">
                            {facility.type || facility.category}
                          </p>
                          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{facility.address}</p>
                          
                          <div className="space-y-2">
                            {facility.phone !== 'Phone not available' && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4 text-green-600" />
                                <span className="font-medium">{facility.phone}</span>
                              </div>
                            )}
                            
                            {facility.opening_hours !== 'Hours not available' && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span>{facility.opening_hours}</span>
                              </div>
                            )}
                            
                            {facility.emergency && (
                              <div className="flex items-center gap-2 text-sm text-red-600 font-bold bg-red-50 px-2 py-1 rounded-md">
                                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                                Emergency Services Available
                              </div>
                            )}
                            
                            {facility.website && (
                              <div className="flex items-center gap-2 text-sm">
                                <Globe className="w-4 h-4 text-blue-600" />
                                <a 
                                  href={facility.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
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
    </div>
  );
};

export default MedicalFacilitiesFinder;