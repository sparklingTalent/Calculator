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
      
      console.log(`📊 Processing tab "${result.tabName}": ${parsed.countries.size} countries, ${Object.keys(parsed.shippingLines).length} countries with direct shipping lines, ${Object.keys(parsed.zones).length} countries with zones`);
      
      parsed.countries.forEach(c => {
        allCountries.add(c);
        console.log(`   Found country: "${c}"`);
      });
      
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
        const shippingLineKeys = Object.keys(parsed.shippingLines[country]);
        console.log(`   ${country} shipping lines from this tab: ${shippingLineKeys.join(', ')}`);
        
        for (const shippingLine of shippingLineKeys) {
          if (!allShippingLines[country][shippingLine]) {
            allShippingLines[country][shippingLine] = {
              bands: [],
              transitTime: null
            };
          }
          // Merge bands
          const bandsToAdd = parsed.shippingLines[country][shippingLine].bands || [];
          allShippingLines[country][shippingLine].bands.push(...bandsToAdd);
          console.log(`     Merged ${bandsToAdd.length} bands for "${shippingLine}" (total: ${allShippingLines[country][shippingLine].bands.length})`);
          
          // Use transit time from second tab if available
          if (isSecondTab && parsed.shippingLines[country][shippingLine].transitTime) {
            allShippingLines[country][shippingLine].transitTime = parsed.shippingLines[country][shippingLine].transitTime;
          }
        }
      }
    }
    
    // First, collect all unique shipping line keys for each country (from both zones and direct shipping lines)
    const countryShippingLineKeys = {}; // country -> Set of shipping line keys
    
    for (const country of allCountries) {
      countryShippingLineKeys[country] = new Set();
      
      // Add shipping lines from direct shippingLines structure
      if (allShippingLines[country]) {
        Object.keys(allShippingLines[country]).forEach(key => {
          countryShippingLineKeys[country].add(key);
        });
      }
      
      // Add shipping lines from zones structure
      if (allZones[country]) {
        for (const zone of Object.keys(allZones[country])) {
          if (allZones[country][zone]) {
            Object.keys(allZones[country][zone]).forEach(key => {
              countryShippingLineKeys[country].add(key);
            });
          }
        }
      }
    }
    
    // Filter out countries with no shipping lines
    const countriesWithShippingLines = Array.from(allCountries).filter(country => {
      return countryShippingLineKeys[country] && countryShippingLineKeys[country].size > 0;
    });
    
    console.log(`🌍 Total countries: ${allCountries.size}, Countries with shipping lines: ${countriesWithShippingLines.length}`);
    
    // Sort countries: common countries first, then alphabetically
    const commonCountries = ['United States', 'USA', 'US', 'Canada', 'United Kingdom', 'UK', 'Australia', 'Germany'];
    const sortedCountries = countriesWithShippingLines.sort((a, b) => {
      // Normalize country names for matching
      const normalizeCountry = (country) => {
        const lower = country.toLowerCase();
        if (lower.includes('united states') || lower === 'usa' || lower === 'us') return 'united states';
        if (lower === 'canada') return 'canada';
        if (lower.includes('united kingdom') || lower === 'uk') return 'united kingdom';
        if (lower === 'australia') return 'australia';
        if (lower === 'germany') return 'germany';
        return null;
      };
      
      const aNormalized = normalizeCountry(a);
      const bNormalized = normalizeCountry(b);
      
      const commonOrder = ['united states', 'canada', 'united kingdom', 'australia', 'germany'];
      const aIndex = aNormalized ? commonOrder.indexOf(aNormalized) : -1;
      const bIndex = bNormalized ? commonOrder.indexOf(bNormalized) : -1;
      
      // If both are common countries, sort by their order in commonOrder
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only a is common, it comes first
      if (aIndex !== -1) return -1;
      // If only b is common, it comes first
      if (bIndex !== -1) return 1;
      // If neither is common, sort alphabetically
      return a.localeCompare(b);
    });
    
    const result = {
      countries: sortedCountries,
      countriesData: {}
    };
    
    // Organize data by country (only for countries with shipping lines)
    for (const country of countriesWithShippingLines) {
      const hasZones = !!(allZones[country] && Object.keys(allZones[country]).length > 0);
      
      // Extract all available shipping lines for this country
      const availableShippingLines = [];
      const shippingLineKeys = Array.from(countryShippingLineKeys[country]);
      
      console.log(`📦 ${country} has ${shippingLineKeys.length} shipping lines: ${shippingLineKeys.join(', ')}`);
      
      for (const key of shippingLineKeys) {
        // Get shipping line name from key (convert from "standard-battery" to "Standard Battery")
        const name = key === 'default' 
          ? extractShippingLineNameFromTabs(dataTabs, country) || 'Standard'
          : key.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
        
        // Calculate weight limits for this shipping line
        // Check both zones (if country has zones) and direct shipping lines
        let maxWeightKg = 0;
        let maxWeightLb = 0;
        let transitTime = null;
        
        // Check shipping lines data
        if (allShippingLines[country] && allShippingLines[country][key]) {
          const shippingLineData = allShippingLines[country][key];
          if (shippingLineData && shippingLineData.bands && shippingLineData.bands.length > 0) {
            for (const band of shippingLineData.bands) {
              if (band.weightKg && band.weightKg.max > maxWeightKg) {
                maxWeightKg = band.weightKg.max;
              }
              if (band.weightLb && band.weightLb.max > maxWeightLb) {
                maxWeightLb = band.weightLb.max;
              }
              // Get transit time from first band that has it
              if (!transitTime && band.transitTime) {
                transitTime = band.transitTime;
              }
            }
          }
          // Also check service-level transit time
          if (!transitTime && shippingLineData.transitTime) {
            transitTime = shippingLineData.transitTime;
          }
        }
        
        // Also check zones data if country has zones
        if (allZones[country]) {
          for (const zone of Object.keys(allZones[country])) {
            if (allZones[country][zone] && allZones[country][zone][key] && allZones[country][zone][key].bands) {
              for (const band of allZones[country][zone][key].bands) {
                if (band.weightKg && band.weightKg.max > maxWeightKg) {
                  maxWeightKg = band.weightKg.max;
                }
                if (band.weightLb && band.weightLb.max > maxWeightLb) {
                  maxWeightLb = band.weightLb.max;
                }
                // Get transit time from first band that has it
                if (!transitTime && band.transitTime) {
                  transitTime = band.transitTime;
                }
              }
              // Check zone-level transit time
              if (!transitTime && allZones[country][zone][key].transitTime) {
                transitTime = allZones[country][zone][key].transitTime;
              }
            }
          }
        }
        
        // Format transit time for display
        let deliveryTime = null;
        if (transitTime) {
          if (typeof transitTime === 'string') {
            // If it already includes "days", use as-is
            if (transitTime.toLowerCase().includes('days') || transitTime.toLowerCase().includes('day')) {
              deliveryTime = transitTime;
            } else if (transitTime.match(/^\d+$/)) {
              // If it's just a number, assume days
              deliveryTime = `${transitTime} days`;
            } else {
              // Use as-is for ranges like "5-7 days"
              deliveryTime = transitTime;
            }
          } else if (typeof transitTime === 'number' && transitTime > 0 && transitTime <= 365) {
            deliveryTime = `${Math.round(transitTime)} days`;
          }
        }
        
        availableShippingLines.push({
          key: key,
          name: name,
          maxWeightKg: maxWeightKg > 0 ? parseFloat(maxWeightKg.toFixed(2)) : null,
          maxWeightLb: maxWeightLb > 0 ? parseFloat(maxWeightLb.toFixed(2)) : null,
          deliveryTime: deliveryTime
        });
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
    
    // Validate weight
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      return res.status(400).json({ error: 'Weight must be a positive number' });
    }
    
    // Convert to lb for minimum weight check (0.25 lbs minimum)
    const weightInLbForValidation = weightUnit === 'lb' ? weightNum : weightNum * 2.20462;
    const minWeightLb = 0.25;
    
    if (weightInLbForValidation < minWeightLb) {
      const minWeightInUnit = weightUnit === 'lb' ? minWeightLb : (minWeightLb / 2.20462).toFixed(2);
      return res.status(400).json({ 
        error: `Weight must be at least ${minWeightInUnit} ${weightUnit}. Minimum weight is 0.25 lbs (0.11 kg).` 
      });
    }
    
    if (weightNum > 9999.99) {
      return res.status(400).json({ error: 'Weight cannot exceed 9999.99' });
    }
    
    // Ensure weight has max 2 decimal places
    const normalizedWeight = parseFloat(weightNum.toFixed(2));
    
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
    
    // Convert weight to both units for band matching (using normalized weight)
    const weightInKg = convertWeight(normalizedWeight, weightUnit, 'kg');
    const weightInLb = convertWeight(normalizedWeight, weightUnit, 'lb');
    
    // Use the shippingLine from request (normalize it)
    const normalizedShippingLine = shippingLine.toLowerCase().replace(/\s+/g, '-');
    
    // Get service data - try to find matching shipping line
    let serviceData = null;
    let transitTime = null;
    let foundShippingLineKey = null;
    
    // For countries with zones (like Australia), check zones first
    if (zone && allZones[country] && allZones[country][zone]) {
      // Get available shipping line keys from the zone
      const zoneShippingLineKeys = Object.keys(allZones[country][zone]);
      
      if (zoneShippingLineKeys.length === 0) {
        console.warn(`⚠️  Zone "${zone}" for ${country} has no shipping lines`);
      }
      
      // Try to find matching shipping line in the zone
      // First try exact match
      foundShippingLineKey = zoneShippingLineKeys.find(key => key === normalizedShippingLine);
      
      // Then try partial match
      if (!foundShippingLineKey) {
        foundShippingLineKey = zoneShippingLineKeys.find(key => 
          key.includes(normalizedShippingLine) || 
          normalizedShippingLine.includes(key)
        );
      }
      
      // Finally try 'default' or 'standard' as fallback
      if (!foundShippingLineKey) {
        foundShippingLineKey = zoneShippingLineKeys.find(key => key === 'default') ||
                              zoneShippingLineKeys.find(key => key === 'standard') ||
                              zoneShippingLineKeys[0]; // Use first available if nothing matches
      }
      
      // If found, get service data from zone
      if (foundShippingLineKey && allZones[country][zone][foundShippingLineKey]) {
        serviceData = allZones[country][zone][foundShippingLineKey];
        console.log(`✅ Found shipping line "${foundShippingLineKey}" in ${country} zone "${zone}"`);
      } else {
        console.warn(`⚠️  Shipping line "${normalizedShippingLine}" not found in ${country} zone "${zone}". Available: ${zoneShippingLineKeys.join(', ')}`);
      }
    }
    
    // If not found in zones (or no zone specified), try direct shipping lines
    if (!serviceData && allShippingLines[country]) {
      const availableKeys = Object.keys(allShippingLines[country]);
      
      // Try exact match first
      if (allShippingLines[country][normalizedShippingLine]) {
        foundShippingLineKey = normalizedShippingLine;
        serviceData = allShippingLines[country][foundShippingLineKey];
        console.log(`✅ Found shipping line "${foundShippingLineKey}" in ${country} (direct)`);
      } else {
        // Try to find by matching key or name
        foundShippingLineKey = availableKeys.find(key => key === normalizedShippingLine) ||
                              availableKeys.find(key => key.includes(normalizedShippingLine) || normalizedShippingLine.includes(key)) ||
                              availableKeys.find(key => key === 'default') ||
                              availableKeys.find(key => key === 'standard') ||
                              availableKeys[0]; // Use first available if nothing matches
        
        if (foundShippingLineKey && allShippingLines[country][foundShippingLineKey]) {
          serviceData = allShippingLines[country][foundShippingLineKey];
          console.log(`✅ Found shipping line "${foundShippingLineKey}" in ${country} (direct, matched from "${normalizedShippingLine}")`);
        } else {
          console.warn(`⚠️  Shipping line "${normalizedShippingLine}" not found in ${country} direct shipping lines. Available: ${availableKeys.join(', ')}`);
        }
      }
    }
    
    // If still not found and we have a zone, try to find in any zone (fallback)
    if (!serviceData && zone && allZones[country]) {
      console.log(`⚠️  Trying fallback: searching all zones for ${country}...`);
      for (const zoneKey of Object.keys(allZones[country])) {
        if (allZones[country][zoneKey]) {
          const zoneKeys = Object.keys(allZones[country][zoneKey]);
          const matchingKey = zoneKeys.find(key => key === normalizedShippingLine) ||
                             zoneKeys.find(key => key.includes(normalizedShippingLine) || normalizedShippingLine.includes(key)) ||
                             zoneKeys.find(key => key === 'default') ||
                             zoneKeys.find(key => key === 'standard') ||
                             zoneKeys[0];
          if (matchingKey && allZones[country][zoneKey][matchingKey]) {
            foundShippingLineKey = matchingKey;
            serviceData = allZones[country][zoneKey][matchingKey];
            console.log(`✅ Found shipping line "${foundShippingLineKey}" in ${country} zone "${zoneKey}" (fallback)`);
            break;
          }
        }
      }
    }
    
    // Log what we found for debugging
    console.log(`\n🔍 Calculation request: ${country}${zone ? ` (zone: ${zone})` : ''}, shipping line: "${shippingLine}" (normalized: "${normalizedShippingLine}")`);
    
    if (serviceData) {
      console.log(`✅ Service data found: ${serviceData.bands?.length || 0} bands available`);
      console.log(`   Found shipping line key: "${foundShippingLineKey}"`);
    } else {
      console.error(`❌ No service data found for ${country}${zone ? ` (zone: ${zone})` : ''} with shipping line "${shippingLine}" (normalized: "${normalizedShippingLine}")`);
      
      // Debug: Show what's available
      if (zone && allZones[country] && allZones[country][zone]) {
        console.error(`   Available shipping lines in zone "${zone}": ${Object.keys(allZones[country][zone]).join(', ')}`);
      }
      if (allZones[country]) {
        console.error(`   All zones for ${country}: ${Object.keys(allZones[country]).join(', ')}`);
        for (const z of Object.keys(allZones[country])) {
          console.error(`     Zone "${z}" shipping lines: ${Object.keys(allZones[country][z] || {}).join(', ')}`);
        }
      }
      if (allShippingLines[country]) {
        console.error(`   Direct shipping lines for ${country}: ${Object.keys(allShippingLines[country]).join(', ')}`);
      }
    }
    
    if (!serviceData || !serviceData.bands || serviceData.bands.length === 0) {
      // List available shipping lines in error message
      let availableLines = [];
      
      // Check zones first (for countries with zones)
      if (allZones[country]) {
        for (const zoneKey of Object.keys(allZones[country])) {
          if (allZones[country][zoneKey]) {
            const zoneLines = Object.keys(allZones[country][zoneKey]);
            availableLines.push(...zoneLines);
          }
        }
      }
      
      // Also check direct shipping lines
      if (allShippingLines[country]) {
        availableLines.push(...Object.keys(allShippingLines[country]));
      }
      
      // Remove duplicates
      const uniqueLines = [...new Set(availableLines)];
      const available = uniqueLines.length > 0 
        ? uniqueLines.map(key => key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(', ')
        : 'none';
      
      return res.status(400).json({ 
        error: `Shipping line "${shippingLine}" not found for ${country}${zone ? ` (zone: ${zone})` : ''}. Available: ${available}` 
      });
    }
    
    // Find the appropriate weight band
    const useLb = weightUnit === 'lb';
    const searchWeight = useLb ? weightInLb : weightInKg;
    
    // Find max weight from all bands to validate weight limit
    let maxWeight = 0;
    for (const band of serviceData.bands) {
      const weightBand = useLb ? band.weightLb : band.weightKg;
      if (weightBand && weightBand.max > maxWeight) {
        maxWeight = weightBand.max;
      }
    }
    
    // Check if weight exceeds the maximum weight band
    if (maxWeight > 0 && searchWeight > maxWeight) {
      const maxWeightFormatted = parseFloat(maxWeight.toFixed(2));
      return res.status(400).json({ 
        error: `Weight exceeds maximum allowed weight of ${maxWeightFormatted} ${weightUnit}. Maximum weight for this shipping line is ${maxWeightFormatted} ${weightUnit}.` 
      });
    }
    
    let matchedBand = null;
    for (const band of serviceData.bands) {
      const weightBand = useLb ? band.weightLb : band.weightKg;
      if (weightBand && searchWeight >= weightBand.min && searchWeight < weightBand.max) {
        matchedBand = band;
        break;
      }
    }
    
    // If no match, use the last band (for weights at or above max)
    if (!matchedBand && serviceData.bands.length > 0) {
      matchedBand = serviceData.bands[serviceData.bands.length - 1];
    }
    
    if (!matchedBand) {
      return res.status(400).json({ error: 'No matching weight band found' });
    }
    
    const freightPerUnit = useLb ? matchedBand.freightPerLb : matchedBand.freightPerKg;
    const injectionFee = matchedBand.injection || 0;
    
    // Shipping cost includes freight + injection fee
    const shippingCost = (freightPerUnit * searchWeight) + injectionFee;
    
    // Fulfillment fee is static $1.50 for Pick and Pack
    const fulfillmentFee = 1.50;
    
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
    
    // Calculate breakdown for display
    // Currently, there's no base rate - it's just per unit pricing
    const baseRate = 0; // No base rate in current pricing model
    const perUnitRate = freightPerUnit || 0;
    
    res.json({
      shippingCost: parseFloat(shippingCost.toFixed(2)),
      fulfillmentFee: parseFloat(fulfillmentFee.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      deliveryDays: transitTime || '--',
      serviceName: shippingLine,
      weightUsed: parseFloat(searchWeight.toFixed(2)),
      weightUnit: weightUnit,
      freightPerUnit: freightPerUnit ? parseFloat(freightPerUnit.toFixed(2)) : null,
      baseRate: baseRate,
      perKgRate: weightUnit === 'kg' ? perUnitRate : null,
      perLbRate: weightUnit === 'lb' ? perUnitRate : null,
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

