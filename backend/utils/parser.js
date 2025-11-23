import { parseWeightBand } from './helpers.js';

/**
 * Parse sheet data with weight bands
 * Special handling for United States tab which contains all shipping lines in one tab
 * @param {Array<Array>} rows - Sheet rows
 * @param {string} tabName - Name of the tab being parsed
 * @returns {object} - Parsed data with countries, zones, and shippingLines
 */
export function parsePricingDataWithBands(rows, tabName = '') {
  if (!rows || rows.length < 2) {
    return { countries: new Set(), zones: {}, shippingLines: {} };
  }
  
  const headers = rows[0];
  const countries = new Set();
  const zones = {};
  const shippingLines = {};
  
  // Check if this is a United States tab
  const isUSTab = tabName.toLowerCase().includes('united states') || 
                   (tabName.toLowerCase().includes('us') && 
                    !tabName.toLowerCase().includes('international'));
  
  // Extract shipping line name from tab name
  // For non-US tabs, the tab name itself represents the shipping line
  // e.g., "Standard", "Standard Battery", "Priority", etc.
  const shippingLineFromTab = extractShippingLineFromTabName(tabName, isUSTab);
  let defaultShippingLineKey = shippingLineFromTab || 'default';
  
  // Find column indices - flexible column detection
  const columnIndices = findColumnIndices(headers);
  
  let currentZone = null;
  let currentCountry = '';
  let currentShippingLine = defaultShippingLineKey; // Use shipping line from tab name as default
  
  // If this is a US tab, automatically add United States to countries
  if (isUSTab) {
    currentCountry = 'United States';
    countries.add('United States');
    console.log(`🇺🇸 Detected United States tab: ${tabName}`);
  }
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    // Update current country, zone, and shipping line from row
    const rowData = extractRowData(row, columnIndices, isUSTab, currentCountry);
    
    if (rowData.country) {
      currentCountry = rowData.country;
      countries.add(currentCountry);
      currentZone = null; // Reset zone when country changes
    }
    
    // For US tab, always use United States as country
    if (isUSTab && !currentCountry) {
      currentCountry = 'United States';
      countries.add('United States');
    }
    
    if (rowData.shippingLine) {
      currentShippingLine = rowData.shippingLine;
    }
    
    if (rowData.zone) {
      currentZone = rowData.zone;
    }
    
    // Skip if no country found yet (unless it's a US tab)
    if (!currentCountry && !isUSTab) continue;
    
    // Parse weight bands
    const bandData = parseWeightBandData(row, columnIndices);
    if (!bandData) continue;
    
    // For US tab, use the shipping line from the row; 
    // For other tabs, use shipping line from tab name (or from row if found)
    let shippingLineKey = defaultShippingLineKey;
    if (isUSTab && currentShippingLine !== defaultShippingLineKey) {
      // US tab: use shipping line from data row
      shippingLineKey = currentShippingLine;
    } else if (!isUSTab && currentShippingLine !== defaultShippingLineKey && currentShippingLine !== 'default') {
      // Non-US tab: prefer shipping line from data row if found, otherwise use tab name
      shippingLineKey = currentShippingLine;
    }
    
    // Store the band data
    storeBandData(
      currentCountry,
      currentZone,
      shippingLineKey,
      bandData,
      zones,
      shippingLines
    );
  }
  
  // Log what we found for US tab
  if (isUSTab && shippingLines['United States']) {
    const usShippingLines = Object.keys(shippingLines['United States']);
    console.log(`🇺🇸 United States shipping lines found: ${usShippingLines.join(', ')}`);
  }
  
  // Log what we found for other countries
  if (!isUSTab) {
    for (const country of Object.keys(shippingLines)) {
      const countryShippingLines = Object.keys(shippingLines[country]);
      if (countryShippingLines.length > 0) {
        console.log(`🌍 ${country} shipping lines found: ${countryShippingLines.join(', ')} (from tab: ${tabName})`);
      }
    }
  }
  
  return { countries, zones, shippingLines };
}

/**
 * Extract shipping line name from tab name
 * For non-US tabs, the tab name typically represents the shipping line
 * @param {string} tabName - Tab name
 * @param {boolean} isUSTab - Whether this is a US tab
 * @returns {string|null} - Shipping line key or null
 */
function extractShippingLineFromTabName(tabName, isUSTab) {
  if (!tabName) return null;
  
  let name = tabName.trim();
  
  // For US tabs, we'll extract shipping line from the data itself
  // For other tabs, extract from tab name
  if (isUSTab) {
    return null; // US tabs have shipping lines in the data
  }
  
  // Remove location prefixes
  const locationPatterns = [
    /^united\s+states\s+/i,
    /^us\s+/i,
    /^international\s+/i,
    /^intl\s+/i,
    /\s+united\s+states$/i,
    /\s+us$/i,
    /\s+international$/i,
    /\s+intl$/i
  ];
  
  for (const pattern of locationPatterns) {
    name = name.replace(pattern, '').trim();
  }
  
  // Remove "Pricing" suffix if present
  name = name.replace(/\s+pricing$/i, '').trim();
  
  // Skip if it's a special tab
  const nameLower = name.toLowerCase();
  if (nameLower === 'tab' || 
      nameLower === 'description' ||
      nameLower.includes('rate calculator') ||
      nameLower.includes('other services')) {
    return null;
  }
  
  // If name is empty or too short, return null
  if (!name || name.length < 2) {
    return null;
  }
  
  // Normalize to key format (lowercase, hyphens instead of spaces)
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Find column indices for all relevant columns
 * @param {Array} headers - Header row
 * @returns {object} - Object with column indices
 */
function findColumnIndices(headers) {
  return {
    country: headers.findIndex(h => 
      h && (h.toString().toLowerCase().includes('countr') || 
           h.toString().toLowerCase().includes('destination'))
    ),
    zone: headers.findIndex(h => 
      h && h.toString().toLowerCase().includes('zone')
    ),
    shippingLine: headers.findIndex(h => 
      h && (h.toString().toLowerCase().includes('shipping line') || 
           h.toString().toLowerCase().includes('shipping channel') ||
           h.toString().toLowerCase().includes('service') ||
           h.toString().toLowerCase().includes('method'))
    ),
    transitTime: headers.findIndex(h => 
      h && (h.toString().toLowerCase().includes('transit') || 
           h.toString().toLowerCase().includes('delivery'))
    ),
    weightLb: headers.findIndex(h => 
      h && h.toString().toLowerCase().includes('weight') && 
         h.toString().toLowerCase().includes('lb')
    ),
    weightKg: headers.findIndex(h => 
      h && h.toString().toLowerCase().includes('weight') && 
         h.toString().toLowerCase().includes('kg')
    ),
    freightLb: headers.findIndex(h => 
      h && (h.toString().toLowerCase().includes('freight') || 
           h.toString().toLowerCase().includes('air freight')) && 
         h.toString().toLowerCase().includes('lb')
    ),
    freightKg: headers.findIndex(h => 
      h && (h.toString().toLowerCase().includes('freight') || 
           h.toString().toLowerCase().includes('air freight')) && 
         h.toString().toLowerCase().includes('kg')
    ),
    injection: headers.findIndex(h => 
      h && (h.toString().toLowerCase().includes('injection') || 
           h.toString().toLowerCase().includes('fulfillment') || 
           h.toString().toLowerCase().includes('order'))
    )
  };
}

/**
 * Extract country, zone, and shipping line from a row
 * @param {Array} row - Row data
 * @param {object} indices - Column indices
 * @param {boolean} isUSTab - Whether this is a US tab
 * @param {string} currentCountry - Current country value
 * @returns {object} - Extracted row data
 */
function extractRowData(row, indices, isUSTab, currentCountry) {
  const result = {};
  
  // Check if this row has a country (new country section)
  if (indices.country >= 0 && row[indices.country] && row[indices.country].toString().trim()) {
    const countryValue = row[indices.country].toString().trim();
    if (countryValue && countryValue.toLowerCase() !== 'countries') {
      result.country = countryValue;
    }
  }
  
  // Check if this row has a shipping line (important for US tab)
  if (indices.shippingLine >= 0 && row[indices.shippingLine] && row[indices.shippingLine].toString().trim()) {
    const lineValue = row[indices.shippingLine].toString().trim();
    if (lineValue && 
        lineValue.toLowerCase() !== 'shipping line' && 
        lineValue.toLowerCase() !== 'shipping channel') {
      // Normalize shipping line name (lowercase, replace spaces with hyphens)
      result.shippingLine = lineValue.toLowerCase().replace(/\s+/g, '-');
    }
  }
  
  // Check if this row has a zone
  if (indices.zone >= 0 && row[indices.zone] && row[indices.zone].toString().trim()) {
    const zoneValue = row[indices.zone].toString().trim();
    if (zoneValue && zoneValue.toLowerCase() !== 'zone') {
      result.zone = zoneValue;
    }
  }
  
  return result;
}

/**
 * Parse weight band data from a row
 * @param {Array} row - Row data
 * @param {object} indices - Column indices
 * @returns {object|null} - Band data or null if invalid
 */
function parseWeightBandData(row, indices) {
  const weightLb = indices.weightLb >= 0 ? row[indices.weightLb] : null;
  const weightKg = indices.weightKg >= 0 ? row[indices.weightKg] : null;
  const freightLb = indices.freightLb >= 0 
    ? parseFloat(row[indices.freightLb]?.toString().replace(/[^0-9.]/g, '')) 
    : null;
  const freightKg = indices.freightKg >= 0 
    ? parseFloat(row[indices.freightKg]?.toString().replace(/[^0-9.]/g, '')) 
    : null;
  const injection = indices.injection >= 0 
    ? parseFloat(row[indices.injection]?.toString().replace(/[^0-9.]/g, '')) 
    : null;
  const transitTime = indices.transitTime >= 0 
    ? row[indices.transitTime]?.toString().trim() 
    : null;
  
  if (!weightLb && !weightKg) return null;
  
  const weightBandLb = parseWeightBand(weightLb);
  const weightBandKg = parseWeightBand(weightKg);
  
  if (!weightBandLb && !weightBandKg) return null;
  
  return {
    weightLb: weightBandLb,
    weightKg: weightBandKg,
    freightPerLb: freightLb,
    freightPerKg: freightKg,
    injection: injection || 0,
    transitTime: transitTime
  };
}

/**
 * Store band data in the appropriate structure
 * @param {string} country - Country name
 * @param {string|null} zone - Zone name or null
 * @param {string} shippingLineKey - Shipping line key
 * @param {object} bandData - Band data
 * @param {object} zones - Zones object to update
 * @param {object} shippingLines - Shipping lines object to update
 */
function storeBandData(country, zone, shippingLineKey, bandData, zones, shippingLines) {
  if (zone) {
    // Country uses zones
    if (!zones[country]) {
      zones[country] = {};
    }
    if (!zones[country][zone]) {
      zones[country][zone] = {};
    }
    if (!zones[country][zone][shippingLineKey]) {
      zones[country][zone][shippingLineKey] = {
        bands: [],
        transitTime: bandData.transitTime
      };
    }
    zones[country][zone][shippingLineKey].bands.push(bandData);
  } else {
    // Country doesn't use zones
    if (!shippingLines[country]) {
      shippingLines[country] = {};
    }
    if (!shippingLines[country][shippingLineKey]) {
      shippingLines[country][shippingLineKey] = {
        bands: [],
        transitTime: bandData.transitTime
      };
    }
    shippingLines[country][shippingLineKey].bands.push(bandData);
  }
}

