import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import NodeCache from 'node-cache';
import fs from 'fs';
import compression from 'compression';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
// Cache configuration: 30 minutes for data, 1 hour for sheet names
const cache = new NodeCache({ 
  stdTTL: 1800, // 30 minutes default
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false // Better performance
});

// Enable compression for all responses
app.use(compression());
app.use(cors());
app.use(express.json());

// Initialize Google Sheets API (only if credentials are available)
let sheets = null;
let sheetNamesCache = null; // Pre-fetched sheet names

async function initializeSheets() {
  try {
    const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || './service-account-key.json';
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    // Only initialize if we have both the key file and spreadsheet ID
    if (spreadsheetId && fs.existsSync(keyFile)) {
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      sheets = google.sheets({ version: 'v4', auth });
      console.log('✅ Google Sheets API initialized');
      
      // Pre-fetch sheet names on startup to warm up the cache
      try {
        const cacheKey = `sheet-names-${spreadsheetId}`;
        const response = await sheets.spreadsheets.get({
          spreadsheetId,
          fields: 'sheets.properties.title', // Only fetch what we need
        });
        const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
        cache.set(cacheKey, sheetNames, 3600);
        sheetNamesCache = sheetNames;
        console.log(`✅ Pre-fetched ${sheetNames.length} sheet names`);
      } catch (prefetchError) {
        console.log('⚠️  Could not pre-fetch sheet names:', prefetchError.message);
      }
    } else {
      console.log('❌ Google Sheets API not configured');
      console.log('   Please set GOOGLE_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_KEY in .env');
    }
  } catch (error) {
    console.log('❌ Google Sheets API not configured:', error.message);
  }
}

// Initialize on startup
initializeSheets();

// Helper function to fetch data from Google Sheets (with caching)
async function fetchSheetData(spreadsheetId, range) {
  const cacheKey = `sheet-data-${spreadsheetId}-${range}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  if (!sheets) {
    throw new Error('Google Sheets API not initialized');
  }
  try {
    // If range doesn't include '!', it's just a sheet name - fetch all data
    let actualRange = range;
    if (!range.includes('!')) {
      actualRange = `${range}!A:Z`;
    }
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: actualRange,
      valueRenderOption: 'UNFORMATTED_VALUE', // Faster - no formatting processing
      dateTimeRenderOption: 'SERIAL_NUMBER', // Faster date handling
    });
    const data = response.data.values || [];
    // Cache sheet data for 30 minutes
    cache.set(cacheKey, data, 1800);
    return data;
  } catch (error) {
    console.error(`Error fetching sheet data for range "${range}":`, error.message);
    throw error;
  }
}

// Helper function to fetch all sheet names (with caching and optimized API call)
async function fetchSheetNames(spreadsheetId) {
  const cacheKey = `sheet-names-${spreadsheetId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  if (!sheets) {
    throw new Error('Google Sheets API not initialized');
  }
  try {
    // Optimize: Only fetch sheet properties (titles), not all spreadsheet data
    // This reduces response size and improves speed significantly
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title', // Only fetch what we need
    });
    const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
    // Cache sheet names for 1 hour (3600 seconds)
    cache.set(cacheKey, sheetNames, 3600);
    return sheetNames;
  } catch (error) {
    console.error('Error fetching sheet names:', error);
    throw error;
  }
}

// Helper function to parse weight band from string (e.g., "0-0.66", "0.66-2.2")
function parseWeightBand(weightStr) {
  if (!weightStr) return null;
  const parts = weightStr.toString().split('-').map(p => parseFloat(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { min: parts[0], max: parts[1] };
  }
  return null;
}

// Map shipping channels to their tab patterns
// Each shipping channel has ONE tab (we only need one tab to calculate everything)
// Standard has tabs for International/Intl Standard (no separate US tab)
// Other channels have 1 tab each
function getTabsForShippingChannel(channel, sheetNames) {
  const channelLower = channel.toLowerCase().trim();
  
  // Standard channel - look for International Standard or Intl Standard tabs
  if (channelLower === 'standard' || (channelLower.includes('standard') && !channelLower.includes('battery') && !channelLower.includes('guaranteed'))) {
    // Find Standard tabs - look for "International Standard", "Intl Standard", or just "Standard"
    const standardTabs = sheetNames
      .filter(name => {
        const nameLower = name.toLowerCase();
        return (nameLower.includes('international standard') || 
                nameLower.includes('intl standard') ||
                (nameLower.includes('standard') && 
                 !nameLower.includes('battery') && 
                 !nameLower.includes('guaranteed') &&
                 !nameLower.includes('priority') &&
                 !nameLower.includes('cosmetic') &&
                 !nameLower.includes('bulky') &&
                 !nameLower.includes('bonded'))) &&
               !nameLower.includes('united states'); // Exclude US-specific tabs
      })
      .sort();
    
    // Take first 2 tabs if available (as mentioned: Standard has 2 tabs)
    const selectedTabs = standardTabs.slice(0, 2);
    
    console.log(`📊 Standard channel tabs: ${selectedTabs.join(', ') || 'none'}`);
    
    return {
      tabs: selectedTabs
    };
  }
  
  // Other channels have 1 tab
  // Pattern: "Channel Name" or "Channel Name Pricing" - prefer the one with transit time
  const channelNameVariations = [
    channelLower.replace(/\s+/g, ''),
    channelLower.replace(/\s+/g, '-'),
    channelLower.replace(/\s+/g, ' '),
    channelLower
  ];
  
  const matchingTabs = sheetNames.filter(name => {
    const nameLower = name.toLowerCase();
    // Match if tab name contains any variation of the channel name
    return channelNameVariations.some(variation => nameLower.includes(variation));
  });
  
  // Prefer tab without "Pricing" suffix (usually has transit time)
  const withTransitTime = matchingTabs.filter(name => 
    !name.toLowerCase().includes('pricing')
  );
  const withPricing = matchingTabs.filter(name => 
    name.toLowerCase().includes('pricing')
  );
  
  // Use the one with transit time if available, otherwise use pricing tab
  const selectedTab = withTransitTime[0] || withPricing[0];
  
  console.log(`📊 ${channel} channel tab: ${selectedTab || 'none'}`);
  
  return {
    tabs: selectedTab ? [selectedTab] : []
  };
}

// Parse sheet data with weight bands
// Since shipping channel IS the shipping line, we don't need separate shipping line keys
function parsePricingDataWithBands(rows, tabName = '') {
  if (!rows || rows.length < 2) return { countries: new Set(), zones: {}, shippingLines: {} };
  
  const headers = rows[0];
  const countries = new Set();
  const zones = {};
  const shippingLines = {};
  
  // Find column indices - flexible column detection
  const countryIndex = headers.findIndex(h => 
    h && (h.toString().toLowerCase().includes('countr') || h.toString().toLowerCase().includes('destination'))
  );
  const zoneIndex = headers.findIndex(h => 
    h && h.toString().toLowerCase().includes('zone')
  );
  const transitTimeIndex = headers.findIndex(h => 
    h && (h.toString().toLowerCase().includes('transit') || h.toString().toLowerCase().includes('delivery'))
  );
  const weightLbIndex = headers.findIndex(h => 
    h && h.toString().toLowerCase().includes('weight') && h.toString().toLowerCase().includes('lb')
  );
  const weightKgIndex = headers.findIndex(h => 
    h && h.toString().toLowerCase().includes('weight') && h.toString().toLowerCase().includes('kg')
  );
  const freightLbIndex = headers.findIndex(h => 
    h && (h.toString().toLowerCase().includes('freight') || h.toString().toLowerCase().includes('air freight')) && h.toString().toLowerCase().includes('lb')
  );
  const freightKgIndex = headers.findIndex(h => 
    h && (h.toString().toLowerCase().includes('freight') || h.toString().toLowerCase().includes('air freight')) && h.toString().toLowerCase().includes('kg')
  );
  const injectionIndex = headers.findIndex(h => 
    h && (h.toString().toLowerCase().includes('injection') || h.toString().toLowerCase().includes('fulfillment') || h.toString().toLowerCase().includes('order'))
  );
  
  let currentZone = null;
  let currentCountry = '';
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    // Check if this row has a country (new country section)
    if (countryIndex >= 0 && row[countryIndex] && row[countryIndex].toString().trim()) {
      const countryValue = row[countryIndex].toString().trim();
      if (countryValue && countryValue.toLowerCase() !== 'countries') {
        currentCountry = countryValue;
        countries.add(currentCountry);
        // Reset zone when country changes
        currentZone = null;
      }
    }
    
    // Check if this row has a zone
    if (zoneIndex >= 0 && row[zoneIndex] && row[zoneIndex].toString().trim()) {
      const zoneValue = row[zoneIndex].toString().trim();
      if (zoneValue && zoneValue.toLowerCase() !== 'zone') {
        currentZone = zoneValue;
      }
    }
    
    // Skip if no country found yet
    if (!currentCountry) continue;
    
    // Parse weight bands
    const weightLb = weightLbIndex >= 0 ? row[weightLbIndex] : null;
    const weightKg = weightKgIndex >= 0 ? row[weightKgIndex] : null;
    const freightLb = freightLbIndex >= 0 ? parseFloat(row[freightLbIndex]?.toString().replace(/[^0-9.]/g, '')) : null;
    const freightKg = freightKgIndex >= 0 ? parseFloat(row[freightKgIndex]?.toString().replace(/[^0-9.]/g, '')) : null;
    const injection = injectionIndex >= 0 ? parseFloat(row[injectionIndex]?.toString().replace(/[^0-9.]/g, '')) : null;
    const transitTime = transitTimeIndex >= 0 ? row[transitTimeIndex]?.toString().trim() : null;
    
    if (!weightLb && !weightKg) continue;
    
    const weightBandLb = parseWeightBand(weightLb);
    const weightBandKg = parseWeightBand(weightKg);
    
    if (!weightBandLb && !weightBandKg) continue;
    
    const bandData = {
      weightLb: weightBandLb,
      weightKg: weightBandKg,
      freightPerLb: freightLb,
      freightPerKg: freightKg,
      injection: injection || 0,
      transitTime: transitTime
    };
    
    // Use 'default' as the key since shipping channel IS the shipping line
    const shippingLineKey = 'default';
    
    if (currentZone) {
      // Country uses zones
      if (!zones[currentCountry]) {
        zones[currentCountry] = {};
      }
      if (!zones[currentCountry][currentZone]) {
        zones[currentCountry][currentZone] = {};
      }
      if (!zones[currentCountry][currentZone][shippingLineKey]) {
        zones[currentCountry][currentZone][shippingLineKey] = {
          bands: [],
          transitTime: transitTime
        };
      }
      zones[currentCountry][currentZone][shippingLineKey].bands.push(bandData);
    } else {
      // Country doesn't use zones
      if (!shippingLines[currentCountry]) {
        shippingLines[currentCountry] = {};
      }
      if (!shippingLines[currentCountry][shippingLineKey]) {
        shippingLines[currentCountry][shippingLineKey] = {
          bands: [],
          transitTime: transitTime
        };
      }
      shippingLines[currentCountry][shippingLineKey].bands.push(bandData);
    }
  }
  
  return { countries, zones, shippingLines };
}

// API endpoint to get available shipping channels
app.get('/api/shipping-channels', async (req, res) => {
  try {
    const cacheKey = 'shipping-channels';
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    if (!sheets) {
      return res.status(503).json({ error: 'Google Sheets API not configured' });
    }
    
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'GOOGLE_SHEET_ID not configured' });
    }
    
    const sheetNames = await fetchSheetNames(spreadsheetId);
    
    // Extract shipping channels from tab names
    // Common patterns: "Standard", "Standard Battery", "Priority", etc.
    const channels = new Set();
    
    // Known shipping channels based on tab names
    const knownChannels = [
      'Standard',
      'Standard Battery',
      'Standard Guaranteed',
      'Standard Battery Guaranteed',
      'Priority',
      'Priority Battery',
      'Priority Guaranteed',
      'Priority Battery Guaranteed',
      'Cosmetic',
      'Priority Cosmetic',
      'Bulky',
      'Bulky Battery',
      'Pure Battery',
      'Bonded',
      'Bonded Priority',
      'Bonded Cosmetic'
    ];
    
    // Check which channels exist in the sheet names
    for (const channel of knownChannels) {
      const channelLower = channel.toLowerCase().replace(/\s+/g, '');
      const found = sheetNames.some(name => {
        const nameLower = name.toLowerCase().replace(/\s+/g, '');
        return nameLower.includes(channelLower) || channelLower.includes(nameLower);
      });
      if (found) {
        channels.add(channel);
      }
    }
    
    // Check for International Standard or Intl Standard tabs which indicate Standard channel
    if (sheetNames.some(name => {
      const nameLower = name.toLowerCase();
      return (nameLower.includes('international standard') || 
              nameLower.includes('intl standard') ||
              (nameLower.includes('standard') && 
               !nameLower.includes('battery') && 
               !nameLower.includes('guaranteed') &&
               !nameLower.includes('priority')));
    })) {
      channels.add('Standard');
    }
    
    const result = {
      channels: Array.from(channels).sort(),
      tabs: sheetNames
    };
    
    // Cache for 1 hour
    cache.set(cacheKey, result, 3600);
    res.json(result);
  } catch (error) {
    console.error('Error fetching shipping channels:', error);
    res.status(500).json({ error: 'Failed to fetch shipping channels' });
  }
});

// API endpoint to get countries for a shipping channel
app.get('/api/countries/:shippingChannel', async (req, res) => {
  try {
    const shippingChannel = decodeURIComponent(req.params.shippingChannel);
    const cacheKey = `countries-${shippingChannel}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    if (!sheets) {
      return res.status(503).json({ error: 'Google Sheets API not configured' });
    }
    
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'GOOGLE_SHEET_ID not configured' });
    }
    
    const sheetNames = await fetchSheetNames(spreadsheetId);
    
    // Get tabs for this shipping channel
    const tabInfo = getTabsForShippingChannel(shippingChannel, sheetNames);
    
    const allCountries = new Set();
    const allZones = {};
    const allShippingLines = {};
    
    // Fetch data from all tabs in parallel for better performance
    const allTabs = [
      ...(tabInfo.us || []),
      ...(tabInfo.nonUs || []),
      ...(tabInfo.tabs || [])
    ];
    
    // Fetch all tabs in parallel
    const fetchPromises = allTabs.map(async (tabName) => {
      try {
        const rows = await fetchSheetData(spreadsheetId, tabName);
        const parsed = parsePricingDataWithBands(rows, tabName);
        return parsed;
      } catch (error) {
        console.error(`Error fetching from ${tabName}:`, error.message);
        return null;
      }
    });
    
    const parsedResults = await Promise.all(fetchPromises);
    
    // Merge all parsed results
    for (const parsed of parsedResults) {
      if (!parsed) continue;
      
      parsed.countries.forEach(c => allCountries.add(c));
      
      // Merge zones
      for (const country of Object.keys(parsed.zones)) {
        if (!allZones[country]) allZones[country] = {};
        Object.assign(allZones[country], parsed.zones[country]);
      }
      
      // Merge shipping lines
      for (const country of Object.keys(parsed.shippingLines)) {
        if (!allShippingLines[country]) allShippingLines[country] = {};
        Object.assign(allShippingLines[country], parsed.shippingLines[country]);
      }
    }
    
    // Structure response
    const result = {
      countries: Array.from(allCountries).sort(),
      countriesData: {}
    };
    
    // Organize data by country
    for (const country of allCountries) {
      const hasZones = !!(allZones[country] && Object.keys(allZones[country]).length > 0);
      result.countriesData[country] = {
        zones: allZones[country] || null,
        shippingLines: allShippingLines[country] || null,
        hasZones: hasZones,
        zoneList: hasZones ? Object.keys(allZones[country]).sort() : []
      };
    }
    
    // Cache for 30 minutes
    cache.set(cacheKey, result, 1800);
    res.json(result);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});



// API endpoint to calculate shipping costs
app.post('/api/calculate', async (req, res) => {
  try {
    const { weight, weightUnit, shippingChannel, country, zone } = req.body;
    
    // Validate inputs
    if (!weight || !shippingChannel || !country) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Shipping channel IS the shipping line, so we use 'default' as the key
    const shippingLine = 'default';
    
    if (!sheets) {
      return res.status(503).json({ error: 'Google Sheets API not configured' });
    }
    
    // Try to get data from cache first (from countries endpoint)
    const countriesCacheKey = `countries-${shippingChannel}`;
    let allZones = {};
    let allShippingLines = {};
    
    const cachedCountriesData = cache.get(countriesCacheKey);
    if (cachedCountriesData && cachedCountriesData.countriesData[country]) {
      // Use cached data - much faster!
      const countryData = cachedCountriesData.countriesData[country];
      if (countryData.zones) {
        allZones[country] = countryData.zones;
      }
      if (countryData.shippingLines) {
        allShippingLines[country] = countryData.shippingLines;
      }
    } else {
      // Fallback: fetch from sheets (should rarely happen if countries endpoint was called first)
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      const sheetNames = await fetchSheetNames(spreadsheetId);
      const tabInfo = getTabsForShippingChannel(shippingChannel, sheetNames);
      
      const allTabs = [
        ...(tabInfo.us || []),
        ...(tabInfo.nonUs || []),
        ...(tabInfo.tabs || [])
      ];
      
      // Fetch all tabs in parallel
      const fetchPromises = allTabs.map(async (tabName) => {
        try {
          const rows = await fetchSheetData(spreadsheetId, tabName);
          return parsePricingDataWithBands(rows, tabName);
        } catch (error) {
          console.error(`Error fetching from ${tabName}:`, error.message);
          return null;
        }
      });
      
      const parsedResults = await Promise.all(fetchPromises);
      
      for (const parsed of parsedResults) {
        if (!parsed) continue;
        Object.assign(allZones, parsed.zones);
        Object.assign(allShippingLines, parsed.shippingLines);
      }
    }
    
    // Convert weight to both units for band matching
    const weightInKg = weightUnit === 'lb' ? parseFloat(weight) * 0.453592 : parseFloat(weight);
    const weightInLb = weightUnit === 'lb' ? parseFloat(weight) : parseFloat(weight) / 0.453592;
    
    // Get service data
    let serviceData = null;
    let transitTime = null;
    
    if (zone && allZones[country] && allZones[country][zone] && allZones[country][zone][shippingLine]) {
      serviceData = allZones[country][zone][shippingLine];
    } else if (allShippingLines[country] && allShippingLines[country][shippingLine]) {
      serviceData = allShippingLines[country][shippingLine];
    }
    
    if (!serviceData || !serviceData.bands || serviceData.bands.length === 0) {
      return res.status(400).json({ error: `Shipping line "${shippingLine}" not found for ${country}` });
    }
    
    // Find the appropriate weight band
    const useLb = weightUnit === 'lb';
    const searchWeight = useLb ? weightInLb : weightInKg;
    
    let matchedBand = null;
    for (const band of serviceData.bands) {
      const weightBand = useLb ? band.weightLb : band.weightKg;
      if (weightBand && searchWeight >= weightBand.min && searchWeight < weightBand.max) {
        matchedBand = band;
        break;
      }
    }
    
    // If no match, use the last band (for weights above max)
    if (!matchedBand && serviceData.bands.length > 0) {
      matchedBand = serviceData.bands[serviceData.bands.length - 1];
    }
    
    if (!matchedBand) {
      return res.status(400).json({ error: 'No matching weight band found' });
    }
    
    const freightPerUnit = useLb ? matchedBand.freightPerLb : matchedBand.freightPerKg;
    const shippingCost = freightPerUnit * searchWeight;
    const fulfillmentFee = matchedBand.injection || 0;
    transitTime = matchedBand.transitTime || serviceData.transitTime;
    
    const totalCost = shippingCost + fulfillmentFee;
    
    res.json({
      shippingCost: parseFloat(shippingCost.toFixed(2)),
      fulfillmentFee: parseFloat(fulfillmentFee.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      deliveryDays: transitTime || 'N/A',
      serviceName: shippingChannel,
      weightUsed: parseFloat(searchWeight.toFixed(2)),
      weightUnit: weightUnit,
      freightPerUnit: freightPerUnit ? parseFloat(freightPerUnit.toFixed(2)) : null,
    });
  } catch (error) {
    console.error('Error calculating costs:', error);
    res.status(500).json({ error: 'Failed to calculate costs' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    sheetsConfigured: !!sheets
  });
});

// Cache management endpoint (for debugging/admin)
app.get('/api/cache/stats', (req, res) => {
  const stats = cache.getStats();
  res.json({
    keys: stats.keys,
    hits: stats.hits,
    misses: stats.misses,
    ksize: stats.ksize,
    vsize: stats.vsize
  });
});

// Clear cache endpoint (for admin use)
app.post('/api/cache/clear', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared successfully' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  if (!sheets) {
    console.log('⚠️  Google Sheets not configured - API will return errors');
  }
});
