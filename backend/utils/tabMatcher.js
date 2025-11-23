/**
 * Dynamic shipping line/channel detection and tab matching
 * No hard-coded shipping line information - fully dynamic based on tab names
 */

/**
 * Extract shipping channels/lines dynamically from sheet names
 * Groups tabs by shipping line and detects patterns
 * @param {Array<string>} sheetNames - Available sheet names
 * @returns {Set<string>} - Set of shipping channel/line names
 */
export function extractShippingChannels(sheetNames) {
  const channels = new Set();
  
  // Group tabs by potential shipping line
  // Common patterns: "Standard", "Standard Battery", "Priority", etc.
  // We'll extract unique shipping line names from tab patterns
  
  // Strategy: Look for common patterns in tab names
  // 1. Tabs that contain shipping line names (without "United States", "International", etc.)
  // 2. Group similar tabs together
  // 3. Extract the base shipping line name
  
  const processedTabs = new Set();
  
  for (const tabName of sheetNames) {
    const nameLower = tabName.toLowerCase().trim();
    
    // Skip special tabs that are not shipping lines
    if (nameLower.includes('rate calculator') || 
        nameLower.includes('other services') ||
        nameLower === 'tab' ||
        nameLower === 'description') {
      continue;
    }
    
    // Extract shipping line name from tab
    // Remove common prefixes/suffixes: "United States", "International", "Intl", "Standard", etc.
    let shippingLine = extractShippingLineName(tabName);
    
    if (shippingLine && !processedTabs.has(shippingLine.toLowerCase())) {
      channels.add(shippingLine);
      processedTabs.add(shippingLine.toLowerCase());
    }
  }
  
  return channels;
}

/**
 * Extract shipping line name from a tab name
 * Removes location prefixes (United States, International, etc.) and extracts the base shipping line
 * @param {string} tabName - Tab name
 * @returns {string|null} - Shipping line name or null
 */
function extractShippingLineName(tabName) {
  let name = tabName.trim();
  
  // Skip if it's a special tab that's not a shipping line
  const nameLower = name.toLowerCase();
  if (nameLower === 'tab' || 
      nameLower === 'description' ||
      nameLower.includes('rate calculator') ||
      nameLower.includes('other services')) {
    return null;
  }
  
  // Remove common location prefixes
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
  
  // If name is empty or too short, return null
  if (!name || name.length < 2) {
    return null;
  }
  
  // Capitalize first letter of each word, preserving special formatting
  return name.split(/\s+/)
    .map(word => {
      // Preserve all-caps words (like "USPS", "TIKTOK")
      if (word === word.toUpperCase() && word.length > 1) {
        return word;
      }
      // Capitalize first letter, lowercase rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Group tabs by shipping line
 * Each shipping line typically has 2 tabs (or more)
 * @param {Array<string>} sheetNames - Available sheet names
 * @returns {Map<string, Array<string>>} - Map of shipping line name to tab names
 */
export function groupTabsByShippingLine(sheetNames) {
  const grouped = new Map();
  
  for (const tabName of sheetNames) {
    const shippingLine = extractShippingLineName(tabName);
    
    if (shippingLine) {
      if (!grouped.has(shippingLine)) {
        grouped.set(shippingLine, []);
      }
      grouped.get(shippingLine).push(tabName);
    }
  }
  
  // Sort tabs within each group
  for (const [line, tabs] of grouped.entries()) {
    grouped.set(line, tabs.sort());
  }
  
  return grouped;
}

/**
 * Get tabs for a shipping channel/line
 * Returns both tabs for the shipping line (or the second one if specified)
 * @param {string} channel - Shipping channel/line name
 * @param {Array<string>} sheetNames - Available sheet names
 * @param {boolean} useSecondTabOnly - If true, only return the second tab (for transit time/info)
 * @returns {object} - Object with tabs array
 */
export function getTabsForShippingChannel(channel, sheetNames, useSecondTabOnly = false) {
  const channelLower = channel.toLowerCase().trim();
  
  // Group all tabs by shipping line
  const grouped = groupTabsByShippingLine(sheetNames);
  
  // Find matching shipping line
  let matchingLine = null;
  let matchingTabs = [];
  
  for (const [lineName, tabs] of grouped.entries()) {
    const lineLower = lineName.toLowerCase();
    
    // Try exact match first
    if (lineLower === channelLower) {
      matchingLine = lineName;
      matchingTabs = tabs;
      break;
    }
    
    // Try partial match
    if (lineLower.includes(channelLower) || channelLower.includes(lineLower)) {
      matchingLine = lineName;
      matchingTabs = tabs;
      break;
    }
  }
  
  // If no match found, try to find tabs that contain the channel name
  if (!matchingLine) {
    const directMatches = sheetNames.filter(name => {
      const nameLower = name.toLowerCase();
      return nameLower.includes(channelLower) || channelLower.includes(nameLower);
    });
    
    if (directMatches.length > 0) {
      matchingTabs = directMatches.sort();
    }
  }
  
  // Handle special case: Standard channel might have US and International tabs
  if (channelLower.includes('standard') && !channelLower.includes('battery') && !channelLower.includes('guaranteed')) {
    const usTabs = sheetNames.filter(name => {
      const nameLower = name.toLowerCase();
      return (nameLower.includes('united states') || 
              (nameLower.includes('us') && nameLower.includes('standard'))) &&
             !nameLower.includes('international') &&
             !nameLower.includes('battery') &&
             !nameLower.includes('guaranteed') &&
             !nameLower.includes('priority');
    });
    
    const intlTabs = sheetNames.filter(name => {
      const nameLower = name.toLowerCase();
      return (nameLower.includes('international standard') || 
              nameLower.includes('intl standard') ||
              (nameLower.includes('standard') && nameLower.includes('international'))) &&
             !nameLower.includes('battery') &&
             !nameLower.includes('guaranteed') &&
             !nameLower.includes('priority');
    });
    
    if (usTabs.length > 0 || intlTabs.length > 0) {
      matchingTabs = [...usTabs, ...intlTabs].sort();
    }
  }
  
  // If useSecondTabOnly is true and we have multiple tabs, return only the second one
  if (useSecondTabOnly && matchingTabs.length >= 2) {
    matchingTabs = [matchingTabs[1]]; // Second tab (index 1)
  } else if (useSecondTabOnly && matchingTabs.length === 1) {
    // If only one tab, return it (can't use second)
    matchingTabs = matchingTabs;
  }
  
  console.log(`📊 ${channel} channel tabs: ${matchingTabs.join(', ') || 'none'}`);
  
  return {
    tabs: matchingTabs,
    shippingLine: matchingLine || channel
  };
}

/**
 * Get the second tab for a shipping line (for transit time and additional info)
 * @param {string} channel - Shipping channel/line name
 * @param {Array<string>} sheetNames - Available sheet names
 * @returns {string|null} - Second tab name or null
 */
export function getSecondTabForShippingLine(channel, sheetNames) {
  const tabInfo = getTabsForShippingChannel(channel, sheetNames, true);
  return tabInfo.tabs.length > 0 ? tabInfo.tabs[0] : null;
}
