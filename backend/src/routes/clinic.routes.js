import express from 'express';
import axios from 'axios';

const router = express.Router();

// Helper function to build Overpass query
const buildOverpassQuery = (lat, lng, amenityTypes, delta = 0.05) => {
  const south = parseFloat(lat) - delta;
  const north = parseFloat(lat) + delta;
  const west = parseFloat(lng) - delta;
  const east = parseFloat(lng) + delta;
  
  const typeQueries = amenityTypes.map(type => `
    node["amenity"="${type}"](${south},${west},${north},${east});
    way["amenity"="${type}"](${south},${west},${north},${east});
    relation["amenity"="${type}"](${south},${west},${north},${east});
  `).join('');
  
  return `
    [out:json];
    (
      ${typeQueries}
    );
    out center;
  `;
};

// Helper function to process elements
const processElements = (elements, defaultName) => {
  return elements.map((e) => ({
    id: e.id,
    name: e.tags?.name || defaultName,
    lat: e.lat || e.center?.lat,
    lng: e.lon || e.center?.lon,
    address: e.tags?.['addr:full'] || 
             `${e.tags?.['addr:housenumber'] || ''} ${e.tags?.['addr:street'] || ''}`.trim() ||
             'Address not available',
    phone: e.tags?.phone || 'Phone not available',
    website: e.tags?.website || null,
    opening_hours: e.tags?.opening_hours || 'Hours not available',
    emergency: e.tags?.emergency || null,
    healthcare: e.tags?.healthcare || null,
    medical_system: e.tags?.medical_system || null,
    tags: e.tags,
  }));
};

// Get nearby medical facilities (dispensaries, clinics, hospitals)
router.get('/nearby-medical', async (req, res) => {
  const { lat, lng, radius } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }
  
  const delta = radius ? parseFloat(radius) / 111 : 0.05; // Convert km to degrees (~111km per degree)
  const query = buildOverpassQuery(lat, lng, ['clinic', 'hospital', 'doctors', 'pharmacy'], delta);
  
  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
      headers: { 'Content-Type': 'text/plain' },
    });
    
    const elements = processElements(response.data.elements, 'Unnamed Medical Facility');
    
    // Categorize the results
    const categorized = {
      hospitals: [],
      clinics: [],
      dispensaries: []
    };
    
    elements.forEach(facility => {
      const amenity = facility.tags?.amenity;
      const healthcare = facility.tags?.healthcare;
      const name = facility.name.toLowerCase();
      
      if (amenity === 'hospital' || healthcare === 'hospital') {
        categorized.hospitals.push({ ...facility, type: 'hospital' });
      } else if (amenity === 'pharmacy' || healthcare === 'pharmacy' || 
                 name.includes('dispensary') || name.includes('pharmacy')) {
        categorized.dispensaries.push({ ...facility, type: 'dispensary' });
      } else {
        categorized.clinics.push({ ...facility, type: 'clinic' });
      }
    });
    
    res.json({ 
      success: true, 
      medical_facilities: categorized,
      total_count: elements.length
    });
  } catch (err) {
    console.error("Overpass API error:", err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch medical facilities' });
  }
});

// Get nearby hospitals only
router.get('/nearby-hospitals', async (req, res) => {
  const { lat, lng, radius } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }
  
  const delta = radius ? parseFloat(radius) / 111 : 0.05;
  const query = buildOverpassQuery(lat, lng, ['hospital'], delta);
  
  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
      headers: { 'Content-Type': 'text/plain' },
    });
    
    const elements = processElements(response.data.elements, 'Unnamed Hospital');
    
    res.json({ success: true, hospitals: elements });
  } catch (err) {
    console.error("Overpass API error:", err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch hospitals' });
  }
});

// Get nearby clinics only
router.get('/nearby-clinics', async (req, res) => {
  const { lat, lng, radius } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }
  
  const delta = radius ? parseFloat(radius) / 111 : 0.05;
  const query = buildOverpassQuery(lat, lng, ['clinic', 'doctors'], delta);
  
  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
      headers: { 'Content-Type': 'text/plain' },
    });
    
    const elements = processElements(response.data.elements, 'Unnamed Clinic');
    
    res.json({ success: true, clinics: elements });
  } catch (err) {
    console.error("Overpass API error:", err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch clinics' });
  }
});

// Get nearby dispensaries/pharmacies only
router.get('/nearby-dispensaries', async (req, res) => {
  const { lat, lng, radius } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }
  
  const delta = radius ? parseFloat(radius) / 111 : 0.05;
  const query = buildOverpassQuery(lat, lng, ['pharmacy'], delta);
  
  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
      headers: { 'Content-Type': 'text/plain' },
    });
    
    const elements = processElements(response.data.elements, 'Unnamed Dispensary');
    
    res.json({ success: true, dispensaries: elements });
  } catch (err) {
    console.error("Overpass API error:", err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch dispensaries' });
  }
});

export default router;