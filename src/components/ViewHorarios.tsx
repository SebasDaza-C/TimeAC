import type { Bloque, Jornada } from "../types";

interface Props {
    jornada: Jornada | undefined;
    bloques: Bloque[];
    currentBlock: { block: Bloque, index: number } | undefined;
}

export function ViewHorarios({ jornada, bloques, currentBlock }: Props) {
    if (!jornada) {
        return (
            <div className="glass-card schedule-card">
                <h2 className="jornada-title">Jornada no encontrada</h2>
            </div>
        );
    }

    return (
        <div className="glass-card schedule-card">
            <h2 key={jornada.id} className="jornada-title">Horario</h2>
            <ul className="jornada-list">
                {bloques.map((bloque) => (
                    <li
                        key={bloque.id}
                        className={`jornada-item ${currentBlock?.block.id === bloque.id ? 'active' : ''}`}>
                        <div className="jornada-item-content">
                            <div className="jornada-item-header">
                                <span className="block-name">{bloque.nombre}</span>
                                <span className="block-number-display">{bloque.alias}</span>
                            </div>
                            <div className="block-details">
                                <span className="block-time">{bloque.inicio} - {bloque.fin}</span>
                                <span className="block-duration">({bloque.duracion} min)</span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
