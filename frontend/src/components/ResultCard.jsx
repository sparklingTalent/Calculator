import React from 'react';
import './ResultCard.css';

function ResultCard({ calculation, loading }) {
  if (loading) {
    return (
      <div className="result-card">
        <div className="result-loading">
          <div className="loading-spinner-large"></div>
          <p>Calculating your rate...</p>
        </div>
      </div>
    );
  }

  if (!calculation) {
    return (
      <div className="result-card">
        <div className="result-placeholder">
          <div className="placeholder-icon-wrapper">
            <div className="placeholder-icon">✈️</div>
          </div>
          <h3>Ready to Calculate</h3>
          <p>Fill in the form and click "Calculate Rate" to see your shipping estimate with Portless.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="result-card">
      <div className="result-header">
        <div className="result-header-content">
          <h2>Shipping Estimate</h2>
          <div className="result-badge">
            {calculation.serviceName}
          </div>
        </div>
      </div>

      <div className="result-content">
        <div className="cost-breakdown">
          <div className="cost-item">
            <div className="cost-label">
              <span className="cost-icon">🚚</span>
              <div className="cost-label-text">
                <span className="cost-label-title">Shipping cost</span>
              </div>
            </div>
            <div className="cost-value">${calculation.shippingCost.toFixed(2)}</div>
          </div>

          <div className="cost-item">
            <div className="cost-label">
              <span className="cost-icon">📦</span>
              <div className="cost-label-text">
                <span className="cost-label-title">Pick and Pack</span>
                <span className="cost-label-subtitle">Includes first 3 picks</span>
              </div>
            </div>
            <div className="cost-value">$1.50</div>
          </div>

          <div className="cost-item cost-item-total">
            <div className="cost-label">
              <span className="cost-icon">💰</span>
              <div className="cost-label-text">
                <span className="cost-label-title">Total cost</span>
              </div>
            </div>
            <div className="cost-value cost-value-total">
              ${(calculation.shippingCost + 1.50).toFixed(2)} total
            </div>
          </div>
        </div>

        <div className="result-notes">
          <h3 className="notes-title">Notes on shipping estimate:</h3>
          <ul className="notes-list">
            <li className="notes-item">
              <strong>Storage:</strong> $2 per bin per month (and $15 per pallet per month)
            </li>
            <li className="notes-item">
              <strong>Packaging:</strong> If boxes required, we source and charge cost (poly bags are included)
            </li>
            <li className="notes-item">
              Total cost assumes actual weight equals billable weight
            </li>
          </ul>
        </div>
      </div>

      <div className="result-footer">
        <p className="result-note">
          * Estimates are based on current Portless rates. Final costs will be confirmed at checkout.
        </p>
      </div>
    </div>
  );
}

export default ResultCard;
