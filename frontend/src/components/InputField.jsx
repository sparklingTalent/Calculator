import React from 'react';
import './InputField.css';

function InputField({ label, icon, ...props }) {
  return (
    <div className="input-group">
      <label className="input-label">
        {icon && <span className="label-icon">{icon}</span>}
        {label}
      </label>
      <input className="input-field" {...props} />
    </div>
  );
}

export default InputField;

