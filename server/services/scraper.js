const axios = require('axios');

async function scrapeLeads({ niche, location, limit = 20 }) {
  // Use Google Maps Places API
  if (process.env.GOOGLE_MAPS_API_KEY) {
    return scrapeGoogleMaps({ niche, location, limit });
  }
  // Fallback mock data for testing
  return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
    business_name: `${niche} Business ${i + 1}`,
    website: `https://example${i}.com`,
    email: `contact${i}@example.com`,
    phone: `+1555000${i}000`,
  }));
}

async function scrapeGoogleMaps({ niche, location, limit }) {
  const query = `${niche} in ${location}`;
  const res = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
    params: { query, key: process.env.GOOGLE_MAPS_API_KEY }
  });
  const places = res.data.results.slice(0, limit);
  return Promise.all(places.map(async (p) => {
    let details = {};
    try {
      const d = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: { place_id: p.place_id, fields: 'name,website,formatted_phone_number,international_phone_number', key: process.env.GOOGLE_MAPS_API_KEY }
      });
      details = d.data.result;
    } catch {}
    return {
      business_name: p.name,
      website: details.website || '',
      phone: details.international_phone_number || details.formatted_phone_number || '',
      email: '',
    };
  }));
}

module.exports = { scrapeLeads };
