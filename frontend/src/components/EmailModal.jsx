import React, { useState } from 'react';
import './EmailModal.css';

function EmailModal({ isOpen, onClose, onSend }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    setSending(true);
    try {
      await onSend(email);
      setEmail('');
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Download Results</h3>
          <button
            className="modal-close"
            onClick={handleClose}
            aria-label="Close modal"
            disabled={sending}
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-description">
            Enter your email address to receive a PDF copy of your shipping estimate.
          </p>
          <div className="modal-input-group">
            <label htmlFor="email-input" className="modal-label">
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              className="modal-input"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && email && !sending) {
                  handleSend();
                }
              }}
              disabled={sending}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="modal-btn modal-btn-secondary"
            onClick={handleClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal-btn modal-btn-primary"
            onClick={handleSend}
            disabled={sending || !email}
          >
            {sending ? 'Sending...' : 'Send PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailModal;

