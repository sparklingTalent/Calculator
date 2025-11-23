import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';
import cacheService from './cacheService.js';

dotenv.config();

/**
 * Google Sheets API Service
 * Handles all interactions with Google Sheets API
 */
class SheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
  }

  /**
   * Initialize Google Sheets API
   * Supports both JSON string (from env) and file path for service account key
   */
  async initialize() {
    try {
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      
      if (!this.spreadsheetId) {
        console.log('❌ GOOGLE_SHEET_ID not set');
        return false;
      }
      
      if (!serviceAccountKey) {
        console.log('❌ GOOGLE_SERVICE_ACCOUNT_KEY not set');
        return false;
      }
      
      let auth;
      
      // Try to parse as JSON string (from environment variable)
      try {
        const keyData = JSON.parse(serviceAccountKey);
        auth = new google.auth.GoogleAuth({
          credentials: keyData,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        console.log('✅ Using Google Service Account from environment variable');
      } catch (parseError) {
        // If parsing fails, try as file path
        const keyFile = serviceAccountKey;
        if (fs.existsSync(keyFile)) {
          auth = new google.auth.GoogleAuth({
            keyFile: keyFile,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
          });
          console.log('✅ Using Google Service Account from file');
        } else {
          // Try default file path
          const defaultKeyFile = './service-account-key.json';
          if (fs.existsSync(defaultKeyFile)) {
            auth = new google.auth.GoogleAuth({
              keyFile: defaultKeyFile,
              scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
            console.log('✅ Using Google Service Account from default file');
          } else {
            console.log('❌ Google Service Account key not found');
            return false;
          }
        }
      }
      
      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('✅ Google Sheets API initialized');
      
      // Pre-fetch sheet names on startup to warm up the cache
      await this.warmupCache();
      
      return true;
    } catch (error) {
      console.log('❌ Google Sheets API not configured:', error.message);
      return false;
    }
  }

  /**
   * Warm up cache by pre-fetching sheet names
   */
  async warmupCache() {
    try {
      const sheetNames = await this.fetchSheetNames();
      console.log(`✅ Pre-fetched ${sheetNames.length} sheet names`);
    } catch (error) {
      console.log('⚠️  Could not pre-fetch sheet names:', error.message);
    }
  }

  /**
   * Check if Sheets API is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return !!this.sheets;
  }

  /**
   * Fetch data from a specific sheet/range
   * @param {string} range - Sheet name or range (e.g., "Sheet1" or "Sheet1!A1:Z100")
   * @returns {Promise<Array>} - Array of rows
   */
  async fetchSheetData(range) {
    if (!this.sheets) {
      throw new Error('Google Sheets API not initialized');
    }

    const cacheKey = `sheet-data-${this.spreadsheetId}-${range}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // If range doesn't include '!', it's just a sheet name - fetch all data
      let actualRange = range;
      if (!range.includes('!')) {
        actualRange = `${range}!A:Z`;
      }
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: actualRange,
        valueRenderOption: 'UNFORMATTED_VALUE', // Faster - no formatting processing
        dateTimeRenderOption: 'SERIAL_NUMBER', // Faster date handling
      });
      
      const data = response.data.values || [];
      // Cache sheet data for 30 minutes
      cacheService.set(cacheKey, data, 1800);
      return data;
    } catch (error) {
      console.error(`Error fetching sheet data for range "${range}":`, error.message);
      throw error;
    }
  }

  /**
   * Fetch all sheet names from the spreadsheet
   * @returns {Promise<Array<string>>} - Array of sheet names
   */
  async fetchSheetNames() {
    if (!this.sheets) {
      throw new Error('Google Sheets API not initialized');
    }

    const cacheKey = `sheet-names-${this.spreadsheetId}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Optimize: Only fetch sheet properties (titles), not all spreadsheet data
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'sheets.properties.title', // Only fetch what we need
      });
      
      const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
      // Cache sheet names for 1 hour (3600 seconds)
      cacheService.set(cacheKey, sheetNames, 3600);
      return sheetNames;
    } catch (error) {
      console.error('Error fetching sheet names:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new SheetsService();

