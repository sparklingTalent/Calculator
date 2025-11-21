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
            <div className="placeholder-icon">🚢</div>
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
              <span className="cost-icon">📦</span>
              <div className="cost-label-text">
                <span className="cost-label-title">Fulfillment Fee</span>
                <span className="cost-label-subtitle">Warehouse processing</span>
              </div>
            </div>
            <div className="cost-value">${calculation.fulfillmentFee.toFixed(2)}</div>
          </div>

          <div className="cost-item">
            <div className="cost-label">
              <span className="cost-icon">🚚</span>
              <div className="cost-label-text">
                <span className="cost-label-title">Shipping Cost</span>
                <span className="cost-label-subtitle">
                  Base: ${calculation.baseRate?.toFixed(2) || '0.00'} + 
                  ${calculation.perKgRate?.toFixed(2) || '0.00'}/kg × {calculation.weightUsed?.toFixed(2) || '0.00'}kg
                </span>
              </div>
            </div>
            <div className="cost-value">${calculation.shippingCost.toFixed(2)}</div>
          </div>

          <div className="cost-divider"></div>

          <div className="cost-item cost-item-total">
            <div className="cost-label">
              <span className="cost-icon">💰</span>
              <div className="cost-label-text">
                <span className="cost-label-title">Total Landed Cost</span>
                <span className="cost-label-subtitle">All-inclusive shipping rate</span>
              </div>
            </div>
            <div className="cost-value cost-value-total">
              ${calculation.totalCost.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="result-details">
          <div className="detail-card">
            <div className="detail-icon">📅</div>
            <div className="detail-content">
              <span className="detail-label">Estimated Delivery</span>
              <span className="detail-value">{calculation.deliveryDays} days</span>
            </div>
          </div>
          
          {calculation.serviceDescription && (
            <div className="detail-card">
              <div className="detail-icon">ℹ️</div>
              <div className="detail-content">
                <span className="detail-label">Service Type</span>
                <span className="detail-value">{calculation.serviceDescription}</span>
              </div>
            </div>
          )}
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
