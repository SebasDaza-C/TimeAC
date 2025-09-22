import { useState } from 'react';

interface Props {
    onClose: () => void;
    onSubmit: (password: string) => void;
    error: string;
    className?: string; // Add className prop
}

export function PasswordView({ onClose, onSubmit, error, className }: Props) {
    const [password, setPassword] = useState('');

    const handleSubmit = () => {
        onSubmit(password);
    };

    return (
        <div className={`config-view ${className || ''}`}> {/* Apply className here */}
            <div className="config-content">
                <h2>Ingresar Contraseña</h2>
                {error && <p className="error-message">{error}</p>}
                <div className="config-section">
                    <label htmlFor="password">Contraseña</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                </div>
                <div className="config-controls">
                    <button onClick={handleSubmit}>Ingresar</button>
                    <button onClick={onClose} className="danger-button">Cancelar</button>
                </div>
            </div>
        </div>
    );
}