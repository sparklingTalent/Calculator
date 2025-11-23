import express from 'express';
import sheetsService from '../services/sheetsService.js';
import cacheService from '../services/cacheService.js';
import { parsePricingDataWithBands } from '../utils/parser.js';
import { getTabsForShippingChannel, extractShippingChannels } from '../utils/tabMatcher.js';
import { convertWeight, matchShippingLine } from '../utils/helpers.js';

const router = express.Router();

/**
 * GET /api/countries
 * Get all countries with their available shipping lines (reads from all tabs)
 */
router.get('/countries', async (req, res) => {
  try {
    const cacheKey = 'all-countries';
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    if (!sheetsService.isInitialized()) {
      return res.status(503).json({ error: 'Google Sheets API not configured' });
    }
    
    const sheetNames = await sheetsService.fetchSheetNames();
    
    // Filter out non-data tabs
    const dataTabs = sheetNames.filter(name => {
      const nameLower = name.toLowerCase();
      return !nameLower.includes('rate calculator') && 
             !nameLower.includes('other services') &&
             nameLower !== 'tab' &&
             nameLower !== 'description';
    });
    
    console.log(`📋 Processing ${dataTabs.length} data tabs: ${dataTabs.join(', ')}`);
    
    const allCountries = new Set();
    const allZones = {};
    const allShippingLines = {}; // Structure: country -> shippingLine -> data
    
    // Fetch data from ALL tabs in parallel
    const fetchPromises = dataTabs.map(async (tabName) => {
      try {
        const rows = await sheetsService.fetchSheetData(tabName);
        return {
          tabName,
          parsed: parsePricingDataWithBands(rows, tabName)
        };
      } catch (error) {
        console.error(`Error fetching from ${tabName}:`, error.message);
        return null;
      }
    });
    
    const parsedResults = await Promise.all(fetchPromises);
    
    // Merge all parsed results from all tabs
    for (let i = 0; i < parsedResults.length; i++) {
      const result = parsedResults[i];
      if (!result || !result.parsed) continue;
      
      const parsed = result.parsed;
      const isSecondTab = i % 2 === 1; // Every second tab in a pair
      
      parsed.countries.forEach(c => allCountries.add(c));
      
      // Merge zones
      for (const country of Object.keys(parsed.zones)) {
        if (!allZones[country]) allZones[country] = {};
        for (const zone of Object.keys(parsed.zones[country])) {
          if (!allZones[country][zone]) allZones[country][zone] = {};
          for (const shippingLine of Object.keys(parsed.zones[country][zone])) {
            if (!allZones[country][zone][shippingLine]) {
              allZones[country][zone][shippingLine] = {
                bands: [],
                transitTime: null
              };
            }
            // Merge bands
            allZones[country][zone][shippingLine].bands.push(...parsed.zones[country][zone][shippingLine].bands);
            // Use transit time from second tab if available
            if (isSecondTab && parsed.zones[country][zone][shippingLine].transitTime) {
              allZones[country][zone][shippingLine].transitTime = parsed.zones[country][zone][shippingLine].transitTime;
            }
          }
        }
      }
      
      // Merge shipping lines - this is the key structure
      for (const country of Object.keys(parsed.shippingLines)) {
        if (!allShippingLines[country]) allShippingLines[country] = {};
        for (const shippingLine of Object.keys(parsed.shippingLines[country])) {
          if (!allShippingLines[country][shippingLine]) {
            allShippingLines[country][shippingLine] = {
              bands: [],
              transitTime: null
            };
          }
          // Merge bands
          allShippingLines[country][shippingLine].bands.push(...parsed.shippingLines[country][shippingLine].bands);
          // Use transit time from second tab if available
          if (isSecondTab && parsed.shippingLines[country][shippingLine].transitTime) {
            allShippingLines[country][shippingLine].transitTime = parsed.shippingLines[country][shippingLine].transitTime;
          }
        }
      }
    }
    
    // Structure response: countries with their available shipping lines
    const result = {
      countries: Array.from(allCountries).sort(),
      countriesData: {}
    };
    
    // Organize data by country
    for (const country of allCountries) {
      const hasZones = !!(allZones[country] && Object.keys(allZones[country]).length > 0);
      
      // Extract all available shipping lines for this country
      const availableShippingLines = [];
      if (allShippingLines[country]) {
        const shippingLineKeys = Object.keys(allShippingLines[country]);
        console.log(`📦 ${country} has ${shippingLineKeys.length} shipping lines: ${shippingLineKeys.join(', ')}`);
        
        for (const key of shippingLineKeys) {
          // Get shipping line name from key (convert from "standard-battery" to "Standard Battery")
          const name = key === 'default' 
            ? extractShippingLineNameFromTabs(dataTabs, country) || 'Standard'
            : key.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ');
          
          availableShippingLines.push({
            key: key,
            name: name
          });
        }
      } else {
        console.log(`⚠️  ${country} has no shipping lines in allShippingLines`);
      }
      
      result.countriesData[country] = {
        zones: allZones[country] || null,
        shippingLines: allShippingLines[country] || null,
        hasZones: hasZones,
        zoneList: hasZones ? Object.keys(allZones[country]).sort() : [],
        availableShippingLines: availableShippingLines.length > 0 ? availableShippingLines.sort((a, b) => a.name.localeCompare(b.name)) : []
      };
    }
    
    // Cache for 30 minutes
    cacheService.set(cacheKey, result, 1800);
    res.json(result);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

/**
 * Helper function to extract shipping line name from tabs
 */
function extractShippingLineNameFromTabs(tabs, country) {
  // Try to find shipping line name from tab names
  for (const tab of tabs) {
    if (tab.toLowerCase().includes(country.toLowerCase())) {
      // Extract shipping line name from tab
      let name = tab;
      // Remove country name
      name = name.replace(new RegExp(country, 'gi'), '').trim();
      // Remove location prefixes
      name = name.replace(/^(united states|us|international|intl)\s+/i, '').trim();
      if (name) {
        return name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }
  }
  return null;
}

/**
 * GET /api/countries/:shippingChannel (DEPRECATED - kept for backward compatibility)
 * Get countries and their data for a shipping channel
 */
router.get('/countries/:shippingChannel', async (req, res) => {
  try {
    const shippingChannel = decodeURIComponent(req.params.shippingChannel);
    const cacheKey = `countries-${shippingChannel}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    if (!sheetsService.isInitialized()) {
      return res.status(503).json({ error: 'Google Sheets API not configured' });
    }
    
    const sheetNames = await sheetsService.fetchSheetNames();
    const tabInfo = getTabsForShippingChannel(shippingChannel, sheetNames);
    
    const allCountries = new Set();
    const allZones = {};
    const allShippingLines = {};
    
    // Fetch data from all tabs for this shipping line
    // Each shipping line typically has 2 tabs - we use both
    const allTabs = tabInfo.tabs || [];
    
    if (allTabs.length === 0) {
      return res.status(404).json({ error: `No tabs found for shipping channel: ${shippingChannel}` });
    }
    
    // Fetch all tabs in parallel
    const fetchPromises = allTabs.map(async (tabName) => {
      try {
        const rows = await sheetsService.fetchSheetData(tabName);
        return {
          tabName,
          parsed: parsePricingDataWithBands(rows, tabName)
        };
      } catch (error) {
        console.error(`Error fetching from ${tabName}:`, error.message);
        return null;
      }
    });
    
    const parsedResults = await Promise.all(fetchPromises);
    
    // Merge all parsed results
    // If there are 2 tabs, the second one (index 1) may have transit time and additional info
    for (let i = 0; i < parsedResults.length; i++) {
      const result = parsedResults[i];
      if (!result || !result.parsed) continue;
      
      const parsed = result.parsed;
      const isSecondTab = i === 1 && parsedResults.length >= 2;
      
      parsed.countries.forEach(c => allCountries.add(c));
      
      // Merge zones
      for (const country of Object.keys(parsed.zones)) {
        if (!allZones[country]) allZones[country] = {};
        for (const zone of Object.keys(parsed.zones[country])) {
          if (!allZones[country][zone]) allZones[country][zone] = {};
          for (const shippingLine of Object.keys(parsed.zones[country][zone])) {
            if (!allZones[country][zone][shippingLine]) {
              allZones[country][zone][shippingLine] = {
                bands: [],
                transitTime: null
              };
            }
            // Merge bands
            allZones[country][zone][shippingLine].bands.push(...parsed.zones[country][zone][shippingLine].bands);
            // Use transit time from second tab if available
            if (isSecondTab && parsed.zones[country][zone][shippingLine].transitTime) {
              allZones[country][zone][shippingLine].transitTime = parsed.zones[country][zone][shippingLine].transitTime;
            }
          }
        }
      }
      
      // Merge shipping lines
      for (const country of Object.keys(parsed.shippingLines)) {
        if (!allShippingLines[country]) allShippingLines[country] = {};
        for (const shippingLine of Object.keys(parsed.shippingLines[country])) {
          if (!allShippingLines[country][shippingLine]) {
            allShippingLines[country][shippingLine] = {
              bands: [],
              transitTime: null
            };
          }
          // Merge bands
          allShippingLines[country][shippingLine].bands.push(...parsed.shippingLines[country][shippingLine].bands);
          // Use transit time from second tab if available
          if (isSecondTab && parsed.shippingLines[country][shippingLine].transitTime) {
            allShippingLines[country][shippingLine].transitTime = parsed.shippingLines[country][shippingLine].transitTime;
          }
        }
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
      
      // For United States, extract all available shipping lines from the shippingLines object
      let availableShippingLines = [];
      if (country === 'United States' && allShippingLines[country]) {
        // Get all shipping line keys (these are the available shipping lines for US)
        availableShippingLines = Object.keys(allShippingLines[country]).map(key => ({
          key: key,
          name: key === 'default' ? 'Standard' : key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ')
        }));
      }
      
      result.countriesData[country] = {
        zones: allZones[country] || null,
        shippingLines: allShippingLines[country] || null,
        hasZones: hasZones,
        zoneList: hasZones ? Object.keys(allZones[country]).sort() : [],
        availableShippingLines: availableShippingLines.length > 0 ? availableShippingLines : null
      };
    }
    
    // Cache for 30 minutes
    cacheService.set(cacheKey, result, 1800);
    res.json(result);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

/**
 * POST /api/calculate
 * Calculate shipping costs based on input parameters
 */
router.post('/calculate', async (req, res) => {
  try {
    const { weight, weightUnit, country, shippingLine, zone } = req.body;
    
    // Validate inputs - now using country and shippingLine instead of shippingChannel
    if (!weight || !country || !shippingLine) {
      return res.status(400).json({ error: 'Missing required fields: weight, country, and shippingLine are required' });
    }
    
    if (!sheetsService.isInitialized()) {
      return res.status(503).json({ error: 'Google Sheets API not configured' });
    }
    
    // Try to get data from cache first (from countries endpoint)
    const countriesCacheKey = 'all-countries';
    let allZones = {};
    let allShippingLines = {};
    
    const cachedCountriesData = cacheService.get(countriesCacheKey);
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
      // Fallback: fetch from all tabs (should rarely happen if countries endpoint was called first)
      const sheetNames = await sheetsService.fetchSheetNames();
      const dataTabs = sheetNames.filter(name => {
        const nameLower = name.toLowerCase();
        return !nameLower.includes('rate calculator') && 
               !nameLower.includes('other services') &&
               nameLower !== 'tab' &&
               nameLower !== 'description';
      });
      
      // Fetch all tabs in parallel
      const fetchPromises = dataTabs.map(async (tabName) => {
        try {
          const rows = await sheetsService.fetchSheetData(tabName);
          return {
            tabName,
            parsed: parsePricingDataWithBands(rows, tabName)
          };
        } catch (error) {
          console.error(`Error fetching from ${tabName}:`, error.message);
          return null;
        }
      });
      
      const parsedResults = await Promise.all(fetchPromises);
      
      // Merge results (second tab has transit time and additional info)
      for (let i = 0; i < parsedResults.length; i++) {
        const result = parsedResults[i];
        if (!result || !result.parsed) continue;
        
        const parsed = result.parsed;
        const isSecondTab = i % 2 === 1;
        
        // Merge zones
        for (const countryKey of Object.keys(parsed.zones)) {
          if (!allZones[countryKey]) allZones[countryKey] = {};
          for (const zoneKey of Object.keys(parsed.zones[countryKey])) {
            if (!allZones[countryKey][zoneKey]) allZones[countryKey][zoneKey] = {};
            for (const shippingLineKey of Object.keys(parsed.zones[countryKey][zoneKey])) {
              if (!allZones[countryKey][zoneKey][shippingLineKey]) {
                allZones[countryKey][zoneKey][shippingLineKey] = {
                  bands: [],
                  transitTime: null
                };
              }
              allZones[countryKey][zoneKey][shippingLineKey].bands.push(...parsed.zones[countryKey][zoneKey][shippingLineKey].bands);
              if (isSecondTab && parsed.zones[countryKey][zoneKey][shippingLineKey].transitTime) {
                allZones[countryKey][zoneKey][shippingLineKey].transitTime = parsed.zones[countryKey][zoneKey][shippingLineKey].transitTime;
              }
            }
          }
        }
        
        // Merge shipping lines
        for (const countryKey of Object.keys(parsed.shippingLines)) {
          if (!allShippingLines[countryKey]) allShippingLines[countryKey] = {};
          for (const shippingLineKey of Object.keys(parsed.shippingLines[countryKey])) {
            if (!allShippingLines[countryKey][shippingLineKey]) {
              allShippingLines[countryKey][shippingLineKey] = {
                bands: [],
                transitTime: null
              };
            }
            allShippingLines[countryKey][shippingLineKey].bands.push(...parsed.shippingLines[countryKey][shippingLineKey].bands);
            if (isSecondTab && parsed.shippingLines[countryKey][shippingLineKey].transitTime) {
              allShippingLines[countryKey][shippingLineKey].transitTime = parsed.shippingLines[countryKey][shippingLineKey].transitTime;
            }
          }
        }
      }
    }
    
    // Convert weight to both units for band matching
    const weightInKg = convertWeight(parseFloat(weight), weightUnit, 'kg');
    const weightInLb = convertWeight(parseFloat(weight), weightUnit, 'lb');
    
    // Use the shippingLine from request (normalize it)
    const normalizedShippingLine = shippingLine.toLowerCase().replace(/\s+/g, '-');
    
    // Get service data - try to find matching shipping line
    let serviceData = null;
    let transitTime = null;
    let foundShippingLineKey = null;
    
    // Try exact match first
    if (allShippingLines[country] && allShippingLines[country][normalizedShippingLine]) {
      foundShippingLineKey = normalizedShippingLine;
    } else if (allShippingLines[country]) {
      // Try to find by matching key or name
      const availableKeys = Object.keys(allShippingLines[country]);
      foundShippingLineKey = availableKeys.find(key => 
        key === normalizedShippingLine || 
        key.includes(normalizedShippingLine) || 
        normalizedShippingLine.includes(key)
      ) || availableKeys.find(key => key === 'default');
    }
    
    if (zone && allZones[country] && allZones[country][zone] && foundShippingLineKey && allZones[country][zone][foundShippingLineKey]) {
      serviceData = allZones[country][zone][foundShippingLineKey];
    } else if (foundShippingLineKey && allShippingLines[country] && allShippingLines[country][foundShippingLineKey]) {
      serviceData = allShippingLines[country][foundShippingLineKey];
    }
    
    if (!serviceData || !serviceData.bands || serviceData.bands.length === 0) {
      // List available shipping lines in error message
      if (allShippingLines[country]) {
        const available = Object.keys(allShippingLines[country]).join(', ');
        return res.status(400).json({ 
          error: `Shipping line "${shippingLine}" not found for ${country}. Available: ${available}` 
        });
      }
      return res.status(400).json({ error: `No shipping lines found for ${country}` });
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
    
    // Clean up transit time - remove any date serial numbers that might have slipped through
    if (transitTime && typeof transitTime === 'string') {
      // Check if it's a large number string (date serial)
      if (transitTime.match(/^\d{5,}$/)) {
        transitTime = null; // Skip invalid transit time
      }
    } else if (transitTime && typeof transitTime === 'number' && transitTime > 1000) {
      transitTime = null; // Skip date serial numbers
    }
    
    const totalCost = shippingCost + fulfillmentFee;
    
    res.json({
      shippingCost: parseFloat(shippingCost.toFixed(2)),
      fulfillmentFee: parseFloat(fulfillmentFee.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      deliveryDays: transitTime || 'N/A',
      serviceName: shippingLine,
      weightUsed: parseFloat(searchWeight.toFixed(2)),
      weightUnit: weightUnit,
      freightPerUnit: freightPerUnit ? parseFloat(freightPerUnit.toFixed(2)) : null,
    });
  } catch (error) {
    console.error('Error calculating costs:', error);
    res.status(500).json({ error: 'Failed to calculate costs' });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    sheetsConfigured: sheetsService.isInitialized()
  });
});

/**
 * GET /api/cache/stats
 * Get cache statistics (for debugging/admin)
 */
router.get('/cache/stats', (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    keys: stats.keys,
    hits: stats.hits,
    misses: stats.misses,
    ksize: stats.ksize,
    vsize: stats.vsize
  });
});

/**
 * POST /api/cache/clear
 * Clear cache (for admin use)
 */
router.post('/cache/clear', (req, res) => {
  cacheService.flushAll();
  res.json({ message: 'Cache cleared successfully' });
});

export default router;

