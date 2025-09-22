import { useState } from 'react';
import type { Bloque, Jornada } from '../types'; // Keep Bloque here for Omit type

interface Props {
    jornadaSettings: { morning: 'normal' | 'especial', afternoon: 'normal' | 'especial' };
    setJornadaSettings: (settings: { morning: 'normal' | 'especial', afternoon: 'normal' | 'especial' }) => void;
    allJornadas: Jornada[];
    setAllJornadas: (jornadas: Jornada[]) => void;
    onClose: () => void;
}

export function ConfigView({ jornadaSettings, setJornadaSettings, allJornadas, setAllJornadas, onClose }: Props) {
    const [selectedJornadaId, setSelectedJornadaId] = useState<number>(allJornadas[0]?.id || 0);

    const handleJornadaTypeToggle = (timeOfDay: 'morning' | 'afternoon') => {
        const newType = jornadaSettings[timeOfDay] === 'normal' ? 'especial' : 'normal';
        setJornadaSettings({ ...jornadaSettings, [timeOfDay]: newType });
    };

    const handleJornadaStartTimeChange = (jornadaId: number, newStartTime: string) => {
        const newJornadas = allJornadas.map(j => {
            if (j.id === jornadaId) {
                return { ...j, startTime: newStartTime };
            }
            return j;
        });
        setAllJornadas(newJornadas);
    };

    const handleBlockChange = (jornadaId: number, blockId: number, field: keyof Omit<Bloque, 'id' | 'inicio' | 'fin'>, value: any) => {
        const newJornadas = allJornadas.map(j => {
            if (j.id === jornadaId) {
                const newBloques = j.bloques.map(b => {
                    if (b.id === blockId) {
                        // Ensure inicio and fin are present, even if empty
                        return { ...b, [field]: field === 'duracion' ? Number(value) : value, inicio: b.inicio || '', fin: b.fin || '' };
                    }
                    return b;
                });
                return { ...j, bloques: newBloques };
            }
            return j;
        });
        setAllJornadas(newJornadas);
    };

    const handleAddBlock = (jornadaId: number) => {
        const newJornadas = allJornadas.map(j => {
            if (j.id === jornadaId) {
                const newBlockId = j.bloques.length > 0 ? Math.max(...allJornadas.flatMap(j => j.bloques).map(b => b.id)) + 1 : 1;
                const newBlock: Bloque = {
                    id: newBlockId,
                    nombre: `Nuevo Bloque ${newBlockId}`,
                    duracion: 10,
                    inicio: '',
                    fin: '',
                };
                return { ...j, bloques: [...j.bloques, newBlock] };
            }
            return j;
        });
        setAllJornadas(newJornadas);
    };

    const handleDeleteBlock = (jornadaId: number, blockId: number) => {
        const newJornadas = allJornadas.map(j => {
            if (j.id === jornadaId) {
                return { ...j, bloques: j.bloques.filter(b => b.id !== blockId) };
            }
            return j;
        });
        setAllJornadas(newJornadas);
    };

    const selectedJornada = allJornadas.find(j => j.id === selectedJornadaId);

    return (
        <div className="config-view">
            <div className="config-content">
                <h2>Configuración</h2>

                <div className="config-section">
                    <h3>Activar Jornada Especial</h3>
                    <div className="config-controls">
                        <span>Mañana: <strong>{jornadaSettings.morning.toUpperCase()}</strong></span>
                        <button onClick={() => handleJornadaTypeToggle('morning')}>
                            Cambiar a {jornadaSettings.morning === 'normal' ? 'Especial' : 'Normal'}
                        </button>
                    </div>
                    <div className="config-controls">
                        <span>Tarde: <strong>{jornadaSettings.afternoon.toUpperCase()}</strong></span>
                        <button onClick={() => handleJornadaTypeToggle('afternoon')}>
                            Cambiar a {jornadaSettings.afternoon === 'normal' ? 'Especial' : 'Normal'}
                        </button>
                    </div>
                </div>

                <div className="config-section">
                    <h3>Editor de Bloques</h3>
                    <label htmlFor="jornada-select">Seleccionar Jornada a Editar:</label>
                    <select 
                        id="jornada-select"
                        value={selectedJornadaId}
                        onChange={(e) => setSelectedJornadaId(Number(e.target.value))}
                    >
                        {allJornadas.map(j => (
                            <option key={j.id} value={j.id}>{j.descripcion}</option>
                        ))}
                    </select>

                    {selectedJornada && (
                        <div style={{marginTop: '1rem'}}>
                            <label>Hora de Inicio de la Jornada:</label>
                            <input 
                                type="time" 
                                value={selectedJornada.startTime}
                                onChange={(e) => handleJornadaStartTimeChange(selectedJornada.id, e.target.value)}
                            />
                             <button onClick={() => handleAddBlock(selectedJornada.id)} style={{ width: '100%', marginTop: '1rem', marginBottom: '1rem' }}>
                                Añadir Bloque a {selectedJornada.descripcion}
                            </button>
                            {selectedJornada.bloques.map(bloque => (
                                <div key={bloque.id} className="block-editor">
                                    <input
                                        type="text"
                                        value={bloque.nombre}
                                        onChange={(e) => handleBlockChange(selectedJornada.id, bloque.id, 'nombre', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        value={bloque.duracion}
                                        onChange={(e) => handleBlockChange(selectedJornada.id, bloque.id, 'duracion', e.target.value)}
                                    />
                                    <button onClick={() => handleDeleteBlock(selectedJornada.id, bloque.id)} className="danger-button">X</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={onClose} className="close-button">Cerrar y Guardar</button>
            </div>
        </div>
    );
}