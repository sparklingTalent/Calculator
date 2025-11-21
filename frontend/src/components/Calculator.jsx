import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InputField from './InputField';
import ResultCard from './ResultCard';
import './Calculator.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Calculator() {
  const [formData, setFormData] = useState({
    shippingChannel: '',
    country: '',
    zone: '',
    weight: '',
    weightUnit: 'kg',
  });

  const [shippingChannels, setShippingChannels] = useState([]);
  const [countries, setCountries] = useState([]);
  const [countriesData, setCountriesData] = useState({});
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [availableZones, setAvailableZones] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch shipping channels on mount
  useEffect(() => {
    fetchShippingChannels();
  }, []);

  // Fetch countries when shipping channel changes
  useEffect(() => {
    if (formData.shippingChannel) {
      fetchCountries(formData.shippingChannel);
      // Reset dependent fields
      setFormData(prev => ({
        ...prev,
        country: '',
        zone: '',
      }));
      setCalculation(null);
    } else {
      setCountries([]);
      setAvailableZones([]);
    }
  }, [formData.shippingChannel]);

  // Update zones when country changes
  useEffect(() => {
    if (formData.country && countriesData[formData.country]) {
      const countryData = countriesData[formData.country];
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
    } else {
      setAvailableZones([]);
    }
  }, [formData.country, countriesData]);

  const fetchShippingChannels = async () => {
    try {
      setLoadingData(true);
      const response = await axios.get(`${API_BASE_URL}/api/shipping-channels`);
      setShippingChannels(response.data.channels || []);
    } catch (err) {
      console.error('Error fetching shipping channels:', err);
      setError('Failed to load shipping channels. Please check your connection.');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchCountries = async (shippingChannel) => {
    try {
      setLoadingData(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/countries/${encodeURIComponent(shippingChannel)}`);
      setCountries(response.data.countries || []);
      setCountriesData(response.data.countriesData || {});
    } catch (err) {
      console.error('Error fetching countries:', err);
      setError(err.response?.data?.error || 'Failed to load countries for this shipping channel.');
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

      const payload = {
        weight: parseFloat(formData.weight),
        weightUnit: formData.weightUnit,
        shippingChannel: formData.shippingChannel,
        country: formData.country,
      };

      // Only include zone if it's needed
      if (formData.zone) {
        payload.zone = formData.zone;
      }

      const response = await axios.post(`${API_BASE_URL}/api/calculate`, payload);
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
      shippingChannel: '',
      country: '',
      zone: '',
      weight: '',
      weightUnit: 'kg',
    });
    setCalculation(null);
    setError(null);
    setCountries([]);
    setCountriesData({});
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
                  <span className="section-icon">🚢</span>
                  Shipping Channel
                </h2>
                
                <div className="input-group">
                  <label htmlFor="shippingChannel" className="input-label">
                    Select Shipping Channel
                  </label>
                  <select
                    id="shippingChannel"
                    value={formData.shippingChannel}
                    onChange={(e) => handleInputChange('shippingChannel', e.target.value)}
                    className="input-field select-field"
                    required
                    disabled={loadingData}
                  >
                    <option value="">
                      {loadingData ? 'Loading channels...' : 'Select shipping channel'}
                    </option>
                    {shippingChannels.map(channel => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                    disabled={!formData.shippingChannel || loadingData}
                  >
                    <option value="">
                      {!formData.shippingChannel 
                        ? 'Select shipping channel first' 
                        : loadingData 
                        ? 'Loading countries...'
                        : 'Select destination country'}
                    </option>
                    {countries.map(country => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                {showZoneField && (
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
              </div>

              <div className="form-section">
                <h2 className="section-title">
                  <span className="section-icon">📦</span>
                  Package Details
                </h2>
                
                <div className="input-group">
                  <label htmlFor="weight" className="input-label">
                    Weight
                  </label>
                  <div className="weight-input-group">
                    <input
                      id="weight"
                      type="number"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      className="input-field weight-input"
                      placeholder="0.0"
                      step="0.1"
                      min="0"
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
                  disabled={loading || loadingData || !formData.weight || !formData.shippingChannel || !formData.country || (showZoneField && !formData.zone)}
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
