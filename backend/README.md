# Backend Structure

This backend has been refactored into a modular, organized structure for better maintainability and scalability.

## 🚀 Fully Dynamic System

**This backend is 100% dynamic** - there are NO hard-coded shipping line/channel names. The system automatically detects shipping lines from Google Sheets tab names, allowing clients to add new shipping lines by simply adding new tabs to the spreadsheet.

## Directory Structure

```
backend/
├── server.js                 # Main entry point (simplified)
├── services/                 # Business logic services
│   ├── cacheService.js       # Cache management service
│   └── sheetsService.js      # Google Sheets API service
├── utils/                    # Utility functions
│   ├── helpers.js            # General helper functions
│   ├── parser.js             # Data parsing utilities
│   └── tabMatcher.js         # Tab matching logic
├── routes/                   # API routes
│   └── api.js                # All API endpoints
└── config/                   # Configuration files (if needed)
```

## Module Descriptions

### `server.js`
Main entry point that:
- Sets up Express app
- Configures middleware (CORS, compression, JSON parsing)
- Registers API routes
- Initializes Google Sheets service
- Starts the server

### `services/cacheService.js`
Singleton service for managing in-memory caching:
- Provides get/set methods with TTL support
- Cache statistics
- Cache clearing functionality

### `services/sheetsService.js`
Singleton service for Google Sheets API interactions:
- Handles authentication (supports JSON string or file path)
- Fetches sheet data with caching
- Fetches sheet names with caching
- Pre-fetches data on startup (warmup)

### `utils/helpers.js`
General utility functions:
- `parseWeightBand()` - Parse weight band strings
- `convertWeight()` - Convert between weight units
- `normalizeShippingLineName()` - Normalize shipping line names
- `matchShippingLine()` - Match shipping channel to shipping line

### `utils/parser.js`
Data parsing utilities:
- `parsePricingDataWithBands()` - Main parser for sheet data
- Handles United States tab special case
- Extracts countries, zones, and shipping lines
- Parses weight bands and pricing data

### `utils/tabMatcher.js`
**Fully dynamic tab matching logic** - NO hard-coded shipping lines:
- `extractShippingChannels()` - Dynamically extracts shipping channels from tab names
- `groupTabsByShippingLine()` - Groups tabs by shipping line (each line typically has 2 tabs)
- `getTabsForShippingChannel()` - Finds tabs for a shipping channel dynamically
- `getSecondTabForShippingLine()` - Gets the second tab (for transit time and additional info)
- Automatically detects shipping lines from tab names
- Removes location prefixes (United States, International, etc.) to extract base shipping line names
- Clients can add new shipping lines by adding tabs - no code changes needed!

### `routes/api.js`
All API endpoints:
- `GET /api/shipping-channels` - Get available shipping channels (dynamically detected from tabs)
- `GET /api/countries/:shippingChannel` - Get countries for a channel
- `POST /api/calculate` - Calculate shipping costs
- `GET /api/health` - Health check
- `GET /api/cache/stats` - Cache statistics
- `POST /api/cache/clear` - Clear cache

**Note**: The shipping channels endpoint automatically detects all shipping lines from tab names - no hard-coding required!

## Benefits of This Structure

1. **Separation of Concerns**: Each module has a single responsibility
2. **Reusability**: Services and utilities can be easily reused
3. **Testability**: Each module can be tested independently
4. **Maintainability**: Easier to find and update code
5. **Scalability**: Easy to add new features without cluttering
6. **Readability**: Clear structure makes code easier to understand
7. **Fully Dynamic**: No hard-coded shipping lines - automatically detects from Google Sheets tabs
8. **Client-Friendly**: Clients can add new shipping lines by adding tabs - no code deployment needed!

## How Dynamic Detection Works

1. **Shipping Line Detection**: The system scans all tab names in the Google Sheet
2. **Name Extraction**: Removes location prefixes (United States, International, etc.) to get base shipping line names
3. **Grouping**: Groups tabs by shipping line (each shipping line typically has 2 tabs)
4. **Second Tab Usage**: The second tab per shipping line is used for transit time and additional information
5. **Automatic Updates**: When new tabs are added, they're automatically detected on the next API call (cache refresh)

## Adding New Shipping Lines

To add a new shipping line, simply:
1. Add new tabs to your Google Sheet following the naming pattern
2. The system will automatically detect them
3. Clear the cache (or wait for it to expire) to see the new shipping line
4. No code changes or deployment needed!

## Usage

The server works exactly the same as before - all functionality is preserved. The refactoring is purely organizational.

```bash
# Start the server
npm start

# Or with node
node server.js
```

## Environment Variables

Required environment variables (unchanged):
- `GOOGLE_SHEET_ID` - Google Sheets spreadsheet ID
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Service account key (JSON string or file path)
- `PORT` - Server port (default: 3001)

