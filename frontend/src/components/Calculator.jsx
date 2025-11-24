import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InputField from './InputField';
import ResultCard from './ResultCard';
import './Calculator.css';

// Get API URL from environment variable (Vite requires VITE_ prefix)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Debug: Log API URL (check browser console)
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('📦 VITE_API_URL env var:', import.meta.env.VITE_API_URL);

function Calculator() {
  const [formData, setFormData] = useState({
    country: '',
    shippingLine: '',
    zone: '',
    weight: '',
    weightUnit: 'kg',
  });

  const [countries, setCountries] = useState([]);
  const [countriesData, setCountriesData] = useState({});
  const [availableShippingLines, setAvailableShippingLines] = useState([]);
  const [selectedShippingLineData, setSelectedShippingLineData] = useState(null);
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [availableZones, setAvailableZones] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch countries on mount
  useEffect(() => {
    fetchCountries();
  }, []);

  // Update zones when country changes
  useEffect(() => {
    if (formData.country && countriesData[formData.country]) {
      const countryData = countriesData[formData.country];
      
      // Update zones
      if (countryData.hasZones && countryData.zoneList) {
        setAvailableZones(countryData.zoneList);
        // Auto-select first zone if none selected
        if (countryData.zoneList.length > 0 && !formData.zone) {
          setFormData(prev => ({ ...prev, zone: countryData.zoneList[0] }));
        }
      } else {
        setAvailableZones([]);
        setFormData(prev => ({ ...prev, zone: '' }));
      }
      
      // Reset shipping line when country changes
      setFormData(prev => ({
        ...prev,
        shippingLine: '',
      }));
    } else {
      setAvailableZones([]);
      setAvailableShippingLines([]);
    }
  }, [formData.country, countriesData]);

  // Update shipping lines when country or zone changes
  useEffect(() => {
    if (formData.country && countriesData[formData.country]) {
      const countryData = countriesData[formData.country];
      
      // Update available shipping lines based on country (and zone if applicable)
      if (countryData.availableShippingLines && countryData.availableShippingLines.length > 0) {
        setAvailableShippingLines(countryData.availableShippingLines);
      } else {
        setAvailableShippingLines([]);
      }
      
      // Reset shipping line when zone changes (if zones exist)
      if (countryData.hasZones) {
        setFormData(prev => ({
          ...prev,
          shippingLine: '',
        }));
        setSelectedShippingLineData(null);
      }
    } else {
      setAvailableShippingLines([]);
      setSelectedShippingLineData(null);
    }
  }, [formData.country, formData.zone, countriesData]);

  // Update selected shipping line data when shipping line changes
  useEffect(() => {
    if (formData.shippingLine && availableShippingLines.length > 0) {
      const shippingLine = availableShippingLines.find(line => line.key === formData.shippingLine);
      setSelectedShippingLineData(shippingLine || null);
    } else {
      setSelectedShippingLineData(null);
    }
  }, [formData.shippingLine, availableShippingLines]);

  const fetchCountries = async () => {
    try {
      setLoadingData(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/countries`);
      console.log('✅ Countries response:', response.data);
      setCountries(response.data.countries || []);
      setCountriesData(response.data.countriesData || {});
    } catch (err) {
      console.error('Error fetching countries:', err);
      setError(err.response?.data?.error || 'Failed to load countries. Please check your connection.');
      setCountries([]);
      setCountriesData({});
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear previous calculation when inputs change
    if (calculation) {
      setCalculation(null);
    }
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setIsCalculating(true);

    try {
      // Small delay for smooth animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Validate inputs before sending
      if (!formData.country || !formData.shippingLine || !formData.weight) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate and format weight (2 decimal places)
      const weightValue = parseFloat(formData.weight);
      if (isNaN(weightValue) || weightValue <= 0) {
        setError('Please enter a valid weight greater than 0');
        return;
      }

      // Check weight limit based on selected shipping line
      if (selectedShippingLineData) {
        const maxWeight = formData.weightUnit === 'kg' 
          ? selectedShippingLineData.maxWeightKg 
          : selectedShippingLineData.maxWeightLb;
        
        if (maxWeight && weightValue > maxWeight) {
          setError(`Weight cannot exceed ${maxWeight.toFixed(2)} ${formData.weightUnit}. Maximum weight for this shipping line is ${maxWeight.toFixed(2)} ${formData.weightUnit}.`);
          return;
        }
      }

      // General limit check
      if (weightValue > 9999.99) {
        setError('Weight cannot exceed 9999.99');
        return;
      }

      const payload = {
        weight: parseFloat(weightValue.toFixed(2)), // Ensure 2 decimal places
        weightUnit: formData.weightUnit,
        country: formData.country,
        shippingLine: formData.shippingLine, // This is the key from availableShippingLines
      };

      // Only include zone if it's needed
      if (formData.zone) {
        payload.zone = formData.zone;
      }

      console.log('📤 Sending calculate request:', payload);
      const response = await axios.post(`${API_BASE_URL}/api/calculate`, payload);
      console.log('✅ Calculate response:', response.data);
      setCalculation(response.data);
    } catch (err) {
      console.error('Calculation error:', err);
      setError(err.response?.data?.error || 'Failed to calculate costs. Please check your inputs.');
    } finally {
      setLoading(false);
      setTimeout(() => setIsCalculating(false), 500);
    }
  };

  const handleReset = () => {
    setFormData({
      country: '',
      shippingLine: '',
      zone: '',
      weight: '',
      weightUnit: 'kg',
    });
    setCalculation(null);
    setError(null);
    setAvailableShippingLines([]);
    setAvailableZones([]);
  };

  const showZoneField = availableZones.length > 0;

  return (
    <div className="calculator-wrapper">
      <div className="calculator-container">
        <div className="calculator-header">
          <div className="header-content">
            <h1>Portless Rate Calculator</h1>
            <p className="subtitle">
              Get instant shipping estimates with dynamic rate calculation
            </p>
          </div>
        </div>

        <div className="calculator-grid">
          <div className="calculator-form-section">
            <form onSubmit={handleCalculate} className="calculator-form">
              <div className="form-section">
                <h2 className="section-title">
                  <span className="section-icon">📍</span>
                  Destination
                </h2>
                
                <div className="input-group">
                  <label htmlFor="country" className="input-label">
                    Country
                  </label>
                  <select
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="input-field select-field"
                    required
                    disabled={loadingData}
                  >
                    <option value="">
                      {loadingData ? 'Loading countries...' : 'Select destination country'}
                    </option>
                    {countries.map(country => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                {showZoneField && formData.country && (
                  <div className="input-group zone-field fade-in">
                    <label htmlFor="zone" className="input-label">
                      Zone
                    </label>
                    <select
                      id="zone"
                      value={formData.zone}
                      onChange={(e) => handleInputChange('zone', e.target.value)}
                      className="input-field select-field"
                      required
                      disabled={!formData.country || loadingData}
                    >
                      <option value="">Select zone</option>
                      {availableZones.map(zone => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="input-group">
                  <label htmlFor="shippingLine" className="input-label">
                    Shipping Line
                  </label>
                  <select
                    id="shippingLine"
                    value={formData.shippingLine}
                    onChange={(e) => handleInputChange('shippingLine', e.target.value)}
                    className="input-field select-field"
                    required
                    disabled={!formData.country || (showZoneField && !formData.zone) || loadingData || availableShippingLines.length === 0}
                  >
                    <option value="">
                      {!formData.country
                        ? 'Select country first'
                        : showZoneField && !formData.zone
                        ? 'Select zone first'
                        : availableShippingLines.length === 0
                        ? 'No shipping lines available'
                        : 'Select shipping line'}
                    </option>
                    {availableShippingLines.map(line => (
                      <option key={line.key} value={line.key}>
                        {line.name}{line.deliveryTime ? ` (${line.deliveryTime})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h2 className="section-title">
                  <span className="section-icon">📦</span>
                  Package Details
                </h2>
                
                <div className="input-group">
                  <label htmlFor="weight" className="input-label">
                    Weight
                    {selectedShippingLineData && selectedShippingLineData.maxWeightKg && selectedShippingLineData.maxWeightLb && (
                      <span className="weight-limit-info">
                        <span className="limit-text">
                          (Max: {formData.weightUnit === 'kg' 
                            ? `${selectedShippingLineData.maxWeightKg} kg` 
                            : `${selectedShippingLineData.maxWeightLb} lb`})
                        </span>
                      </span>
                    )}
                  </label>
                  <div className="weight-input-group">
                    <input
                      id="weight"
                      type="number"
                      value={formData.weight}
                      onChange={(e) => {
                        // Allow 2 decimal places
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                          handleInputChange('weight', value);
                        }
                      }}
                      className="input-field weight-input"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={selectedShippingLineData 
                        ? (formData.weightUnit === 'kg' 
                            ? selectedShippingLineData.maxWeightKg || 9999.99
                            : selectedShippingLineData.maxWeightLb || 9999.99)
                        : 9999.99}
                      required
                    />
                    <select
                      value={formData.weightUnit}
                      onChange={(e) => handleInputChange('weightUnit', e.target.value)}
                      className="input-field weight-unit-select"
                    >
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                    </select>
                  </div>
                  {selectedShippingLineData && selectedShippingLineData.maxWeightKg && selectedShippingLineData.maxWeightLb && (
                    <div className="weight-limit-hint">
                      Maximum weight: {selectedShippingLineData.maxWeightKg} kg ({selectedShippingLineData.maxWeightLb} lb)
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || loadingData || !formData.weight || !formData.country || !formData.shippingLine || (showZoneField && !formData.zone)}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Calculating...
                    </>
                  ) : (
                    <>
                      <span>Calculate Rate</span>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReset}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          <div className="calculator-results-section">
            <ResultCard calculation={calculation} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Calculator;
