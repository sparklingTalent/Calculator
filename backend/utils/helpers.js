/**
 * Parse weight band from string (e.g., "0-0.66", "0.66-2.2")
 * @param {string|number} weightStr - Weight band string
 * @returns {object|null} - Object with min and max, or null if invalid
 */
export function parseWeightBand(weightStr) {
  if (!weightStr) return null;
  const parts = weightStr.toString().split('-').map(p => parseFloat(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { min: parts[0], max: parts[1] };
  }
  return null;
}

/**
 * Convert weight between units
 * @param {number} weight - Weight value
 * @param {string} fromUnit - Source unit ('kg' or 'lb')
 * @param {string} toUnit - Target unit ('kg' or 'lb')
 * @returns {number} - Converted weight
 */
export function convertWeight(weight, fromUnit, toUnit) {
  if (fromUnit === toUnit) return weight;
  
  if (fromUnit === 'lb' && toUnit === 'kg') {
    return weight * 0.453592;
  } else if (fromUnit === 'kg' && toUnit === 'lb') {
    return weight / 0.453592;
  }
  
  return weight;
}

/**
 * Normalize shipping line name for matching
 * @param {string} name - Shipping line name
 * @returns {string} - Normalized name (lowercase, hyphens instead of spaces)
 */
export function normalizeShippingLineName(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Match shipping channel to shipping line
 * @param {string} shippingChannel - Shipping channel name
 * @param {Array<string>} availableLines - Available shipping line keys
 * @returns {string|null} - Matched shipping line key or null
 */
export function matchShippingLine(shippingChannel, availableLines) {
  if (!availableLines || availableLines.length === 0) {
    return null;
  }

  const channelLower = normalizeShippingLineName(shippingChannel);
  
  // Try exact match first
  let matchedLine = availableLines.find(line => line === channelLower);
  
  // Try partial match (e.g., "standard" matches "standard", "standard-battery", etc.)
  if (!matchedLine) {
    matchedLine = availableLines.find(line => 
      line.includes(channelLower) || channelLower.includes(line)
    );
  }
  
  // Try matching "standard" to various standard variants
  if (!matchedLine && channelLower.includes('standard')) {
    matchedLine = availableLines.find(line => 
      line.includes('standard') && !line.includes('battery') && !line.includes('guaranteed')
    ) || availableLines.find(line => line === 'standard');
  }
  
  return matchedLine || null;
}

