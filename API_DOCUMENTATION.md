# Backend API Documentation

Complete reference for all API endpoints in the Portless Shipping Calculator backend.

## Base URL

```
Production: https://your-backend-url.railway.app
Development: http://localhost:3001
```

All endpoints are prefixed with `/api`.

---

## Table of Contents

1. [GET /api/countries](#get-apicountries)
2. [GET /api/countries/:shippingChannel](#get-apicountriesshippingchannel)
3. [POST /api/calculate](#post-apicalculate)
4. [GET /api/health](#get-apihealth)
5. [GET /api/cache/stats](#get-apicachestats)
6. [POST /api/cache/clear](#post-apicacheclear)

---

## GET /api/countries

Get all available countries with their shipping lines, zones, and weight options.

### Description

Fetches all countries from Google Sheets, along with:
- Available shipping lines per country
- Zone information (for countries with zones like Australia)
- Weight limits per shipping line
- Transit/delivery times

This endpoint is cached for 30 minutes to improve performance.

### Request

```http
GET /api/countries
```

**No parameters required.**

### Response

**Success (200 OK):**

```json
{
  "countries": [
    "Australia",
    "Canada",
    "United States",
    "United Kingdom"
  ],
  "countriesData": {
    "United States": {
      "hasZones": false,
      "zoneList": [],
      "zones": null,
      "shippingLines": {
        "standard": {
          "bands": [
            {
              "weightLb": { "min": 0.25, "max": 0.5 },
              "weightKg": { "min": 0.11, "max": 0.23 },
              "freightPerUnit": 1.24,
              "injection": 3.79
            }
          ],
          "transitTime": "6-10 days"
        }
      },
      "availableShippingLines": [
        {
          "key": "standard",
          "name": "Standard",
          "maxWeightKg": 30.0,
          "maxWeightLb": 66.0,
          "deliveryTime": "6-10 days"
        },
        {
          "key": "priority",
          "name": "Priority",
          "maxWeightKg": 30.0,
          "maxWeightLb": 66.0,
          "deliveryTime": "5-8 days"
        }
      ]
    },
    "Australia": {
      "hasZones": true,
      "zoneList": ["Zone 1", "Zone 2", "Zone 3", "Zone 4"],
      "zones": {
        "Zone 1": {
          "standard": {
            "bands": [
              {
                "weightLb": { "min": 0.25, "max": 0.5 },
                "weightKg": { "min": 0.11, "max": 0.23 },
                "freightPerUnit": 2.50,
                "injection": 4.00
              }
            ],
            "transitTime": "8-12 days"
          }
        }
      },
      "shippingLines": null,
      "availableShippingLines": [
        {
          "key": "standard",
          "name": "Standard",
          "maxWeightKg": 30.0,
          "maxWeightLb": 66.0,
          "deliveryTime": "8-12 days"
        }
      ]
    }
  }
}
```

**Error Responses:**

- `503 Service Unavailable`: Google Sheets API not configured
  ```json
  {
    "error": "Google Sheets API not configured"
  }
  ```

- `500 Internal Server Error`: Failed to fetch countries
  ```json
  {
    "error": "Failed to fetch countries"
  }
  ```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `countries` | `string[]` | Array of all available country names |
| `countriesData` | `object` | Object keyed by country name |
| `countriesData[country].hasZones` | `boolean` | Whether country has zones |
| `countriesData[country].zoneList` | `string[]` | Array of zone names (if hasZones is true) |
| `countriesData[country].zones` | `object\|null` | Zone data structure (null if no zones) |
| `countriesData[country].shippingLines` | `object\|null` | Direct shipping lines (null if country uses zones) |
| `countriesData[country].availableShippingLines` | `array` | List of available shipping lines with metadata |
| `availableShippingLines[].key` | `string` | Shipping line identifier |
| `availableShippingLines[].name` | `string` | Display name for shipping line |
| `availableShippingLines[].maxWeightKg` | `number\|null` | Maximum weight in kg |
| `availableShippingLines[].maxWeightLb` | `number\|null` | Maximum weight in lb |
| `availableShippingLines[].deliveryTime` | `string\|null` | Delivery time estimate |

### Caching

- **Cache Duration**: 30 minutes (1800 seconds)
- **Cache Key**: `all-countries`

### Example Usage

```javascript
// Fetch countries
const response = await fetch('https://your-backend-url.railway.app/api/countries');
const data = await response.json();

// Get available shipping lines for United States
const usShippingLines = data.countriesData['United States'].availableShippingLines;
console.log(usShippingLines);
// [
//   { key: "standard", name: "Standard", maxWeightKg: 30.0, ... },
//   { key: "priority", name: "Priority", maxWeightKg: 30.0, ... }
// ]
```

---

## GET /api/countries/:shippingChannel

Get countries for a specific shipping channel.

### Description

**Note:** This endpoint may be deprecated. Use `/api/countries` instead, which returns all countries regardless of shipping channel.

Fetches countries available for a specific shipping channel (e.g., "Standard", "Priority").

### Request

```http
GET /api/countries/:shippingChannel
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shippingChannel` | `string` | Yes | Shipping channel name (e.g., "Standard", "Priority") |

### Response

**Success (200 OK):**

Similar structure to `/api/countries`, but filtered by shipping channel.

**Error Responses:**

- `503 Service Unavailable`: Google Sheets API not configured
- `500 Internal Server Error`: Failed to fetch countries

---

## POST /api/calculate

Calculate shipping costs based on input parameters.

### Description

Calculates shipping costs, fulfillment fees, and total cost based on:
- Destination country
- Zone (if applicable)
- Shipping line
- Weight (in lb or kg)

Uses cached data from `/api/countries` endpoint when available for faster response times.

### Request

```http
POST /api/calculate
Content-Type: application/json
```

**Request Body:**

```json
{
  "country": "United States",
  "shippingLine": "Standard",
  "zone": "",
  "weight": 2.5,
  "weightUnit": "lb"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `country` | `string` | Yes | Destination country name (must match exactly from countries list) |
| `shippingLine` | `string` | Yes | Shipping line name (e.g., "Standard", "Priority") |
| `zone` | `string` | No | Zone name (required for countries with zones like Australia) |
| `weight` | `number` | Yes | Weight value (positive number, max 2 decimal places) |
| `weightUnit` | `string` | Yes | Weight unit: `"lb"` or `"kg"` |

### Response

**Success (200 OK):**

```json
{
  "shippingCost": 6.19,
  "fulfillmentFee": 1.50,
  "totalCost": 7.69,
  "deliveryDays": "6-10 days",
  "serviceName": "Standard",
  "weightUsed": 2.5,
  "weightUnit": "lb",
  "freightPerUnit": 0.96,
  "baseRate": null,
  "perKgRate": null,
  "perLbRate": 0.96
}
```

**Error Responses:**

- `400 Bad Request`: Missing or invalid fields
  ```json
  {
    "error": "Missing required fields: weight, country, and shippingLine are required"
  }
  ```
  ```json
  {
    "error": "Weight must be a positive number"
  }
  ```
  ```json
  {
    "error": "Weight cannot exceed 9999.99"
  }
  ```

- `404 Not Found`: No pricing data found
  ```json
  {
    "error": "No pricing data found for United States with shipping line Standard"
  }
  ```

- `400 Bad Request`: Weight exceeds limit
  ```json
  {
    "error": "Weight 100.00 lb exceeds maximum weight of 66.00 lb for this shipping line"
  }
  ```

- `503 Service Unavailable`: Google Sheets API not configured
  ```json
  {
    "error": "Google Sheets API not configured"
  }
  ```

- `500 Internal Server Error`: Calculation failed
  ```json
  {
    "error": "Failed to calculate costs"
  }
  ```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `shippingCost` | `number` | Total shipping cost (freight + injection fee) |
| `fulfillmentFee` | `number` | Pick and pack fee (currently fixed at $1.50) |
| `totalCost` | `number` | Total cost (shippingCost + fulfillmentFee) |
| `deliveryDays` | `string` | Estimated delivery time (e.g., "6-10 days") |
| `serviceName` | `string` | Shipping line name |
| `weightUsed` | `number` | Weight used in calculation (may differ from input if billable weight is used) |
| `weightUnit` | `string` | Weight unit used ("lb" or "kg") |
| `freightPerUnit` | `number\|null` | Freight rate per unit (lb or kg) |
| `baseRate` | `number\|null` | Base rate (if applicable) |
| `perKgRate` | `number\|null` | Rate per kg (if weightUnit is kg) |
| `perLbRate` | `number\|null` | Rate per lb (if weightUnit is lb) |

### Calculation Logic

1. **Weight Conversion**: Converts input weight to both kg and lb for band matching
2. **Band Matching**: Finds the appropriate weight band for the selected country/zone/shipping line
3. **Cost Calculation**:
   - `shippingCost = (freightPerUnit × weight) + injectionFee`
   - `fulfillmentFee = 1.50` (fixed)
   - `totalCost = shippingCost + fulfillmentFee`

### Example Usage

```javascript
// Calculate shipping cost
const response = await fetch('https://your-backend-url.railway.app/api/calculate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    country: 'United States',
    shippingLine: 'Standard',
    weight: 2.5,
    weightUnit: 'lb'
  })
});

const result = await response.json();
console.log(`Total cost: $${result.totalCost}`);
```

---

## GET /api/health

Health check endpoint to verify API is running.

### Description

Simple endpoint to check if the API is operational and if Google Sheets is configured.

### Request

```http
GET /api/health
```

**No parameters required.**

### Response

**Success (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "sheetsConfigured": true
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Always `"ok"` if endpoint is reachable |
| `timestamp` | `string` | Current server timestamp (ISO 8601) |
| `sheetsConfigured` | `boolean` | Whether Google Sheets API is configured |

### Example Usage

```javascript
// Health check
const response = await fetch('https://your-backend-url.railway.app/api/health');
const health = await response.json();

if (health.status === 'ok' && health.sheetsConfigured) {
  console.log('API is healthy and configured');
} else {
  console.log('API may have issues');
}
```

---

## GET /api/cache/stats

Get cache statistics (for debugging/admin use).

### Description

Returns statistics about the in-memory cache, including:
- Number of cached keys
- Cache hits and misses
- Cache size

### Request

```http
GET /api/cache/stats
```

**No parameters required.**

### Response

**Success (200 OK):**

```json
{
  "keys": 2,
  "hits": 45,
  "misses": 3,
  "ksize": 1024,
  "vsize": 51200
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `keys` | `number` | Number of keys currently in cache |
| `hits` | `number` | Total cache hits (successful retrievals) |
| `misses` | `number` | Total cache misses (keys not found) |
| `ksize` | `number` | Size of keys in bytes |
| `vsize` | `number` | Size of values in bytes |

### Example Usage

```javascript
// Get cache statistics
const response = await fetch('https://your-backend-url.railway.app/api/cache/stats');
const stats = await response.json();

console.log(`Cache hit rate: ${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(1)}%`);
```

---

## POST /api/cache/clear

Clear all cached data (for admin use).

### Description

Clears the entire in-memory cache. Useful for forcing fresh data from Google Sheets without restarting the server.

**Warning:** This will clear all cached data, which may temporarily slow down subsequent requests until cache is rebuilt.

### Request

```http
POST /api/cache/clear
```

**No body required.**

### Response

**Success (200 OK):**

```json
{
  "message": "Cache cleared successfully"
}
```

### Example Usage

```javascript
// Clear cache
const response = await fetch('https://your-backend-url.railway.app/api/cache/clear', {
  method: 'POST'
});

const result = await response.json();
console.log(result.message); // "Cache cleared successfully"
```

---

## Error Handling

All endpoints follow consistent error handling:

### HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service not configured or unavailable

### Error Response Format

All errors return JSON in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Errors

1. **Google Sheets API not configured**
   - Status: `503`
   - Solution: Set `GOOGLE_SHEET_ID` and `GOOGLE_SERVICE_ACCOUNT_KEY` environment variables

2. **Missing required fields**
   - Status: `400`
   - Solution: Ensure all required fields are included in request

3. **Invalid weight**
   - Status: `400`
   - Solution: Ensure weight is a positive number with max 2 decimal places, not exceeding 9999.99

4. **No pricing data found**
   - Status: `404`
   - Solution: Verify country, zone (if applicable), and shipping line combination exists in Google Sheet

---

## Rate Limiting

Currently, there is no rate limiting implemented. However, caching is used extensively to reduce load:
- Countries endpoint: Cached for 30 minutes
- Sheet names: Cached for 1 hour
- Calculation endpoint: Uses cached country data when available

---

## CORS

The API allows cross-origin requests from any origin. In production, you may want to restrict this to your frontend domain.

---

*Last Updated: [Current Date]*

