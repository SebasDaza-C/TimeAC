import { useState } from 'react';

interface Props {
  OnClose: () => void;
  OnSubmit: (Password: string) => void;
  ErrorMessage?: string;
  ClassName?: string;
}

export function PasswordView({ OnClose, OnSubmit, ErrorMessage, ClassName }: Props) {
  const [Password, SetPassword] = useState('');

  const HandleSubmit = () => {
    OnSubmit(Password);
  };

  return (
    <div className={`config-view ${ClassName || ''}`}>
      <div className="config-content">
        <h2>Ingresar Contraseña</h2>
        {ErrorMessage && <p className="error-message">{ErrorMessage}</p>}
        <div className="config-section">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            id="password"
            value={Password}
            onChange={(e) => SetPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && HandleSubmit()}
          />
        </div>
        <div className="config-footer">
          <button onClick={OnClose} className="danger-button">
            Cancelar
          </button>
          <button onClick={HandleSubmit}>Ingresar</button>
        </div>
      </div>
    </div>
  );
}
