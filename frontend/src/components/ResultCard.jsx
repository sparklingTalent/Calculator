import React, { useState } from 'react';
import EmailModal from './EmailModal';
import './ResultCard.css';

function ResultCard({ calculation, loading }) {
  const [showEmailModal, setShowEmailModal] = useState(false);
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
              <span className="cost-icon">✈️</span>
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
              ${calculation.totalCost.toFixed(2)} total
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
              <strong>Total cost assumes actual weight equals billable weight</strong>
            </li>
          </ul>
        </div>
      </div>

      <div className="result-footer">
        <button
          type="button"
          className="download-results-btn"
          onClick={() => setShowEmailModal(true)}
        >
          <span>📥</span>
          Download results
        </button>
        <p className="result-note">
          * Estimates are based on current Portless rates as of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Talk to your Portless logistics consultant.
        </p>
      </div>

      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={async (email) => {
          // TODO: Implement PDF generation and email sending
          // For now, just simulate sending
          return new Promise((resolve) => {
            setTimeout(() => {
              alert('Results will be sent to ' + email);
              resolve();
            }, 1000);
          });
        }}
      />
    </div>
  );
}

export default ResultCard;
