import { useState, useEffect } from 'react';
import { Clock } from './components/Clock';
import { ConfigView } from './components/ConfigView';
import { ViewHorarios } from './components/ViewHorarios';
import type { Jornada, Bloque } from './types';

// --- MOCK DATA ---
const JORNADAS_DATA: Jornada[] = [
    {
        id: 1,
        descripcion: "Jornada Mañana Normal",
        timeOfDay: 'morning',
        tipo: 'normal',
        startTime: '06:30',
        bloques: [
            { id: 1, alias: 1, nombre: 'Bloque 1', duracion: 50, inicio: '', fin: '' },
            { id: 2, alias: 2, nombre: 'Bloque 2', duracion: 50, inicio: '', fin: '' },
            { id: 3, alias: 3, nombre: 'Bloque 3', duracion: 50, inicio: '', fin: '' },
            { id: 4, alias: 'd', nombre: 'Descanso', duracion: 30, inicio: '', fin: '' },
            { id: 5, alias: 4, nombre: 'Bloque 4', duracion: 50, inicio: '', fin: '' },
            { id: 6, alias: 5, nombre: 'Bloque 5', duracion: 50, inicio: '', fin: '' },
            { id: 7, alias: 6, nombre: 'Bloque 6', duracion: 50, inicio: '', fin: '' },
            { id: 8, alias: 7, nombre: 'Bloque 7', duracion: 45, inicio: '', fin: '' },
        ]
    },
    {
        id: 2,
        descripcion: "Jornada Mañana Especial",
        timeOfDay: 'morning',
        tipo: 'especial',
        startTime: '06:30',
        bloques: [
            { id: 9, alias: 'A', nombre: 'Direccion de Grupo', duracion: 60, inicio: '', fin: '' },
            { id: 10, alias: 1, nombre: 'Bloque 1', duracion: 40, inicio: '', fin: '' },
            { id: 11, alias: 2, nombre: 'Bloque 2', duracion: 40, inicio: '', fin: '' },
            { id: 12, alias: 3, nombre: 'Bloque 3', duracion: 40, inicio: '', fin: '' },
            { id: 13, alias: 'd', nombre: 'Descanso', duracion: 30, inicio: '', fin: '' },
            { id: 14, alias: 4, nombre: 'Bloque 4', duracion: 40, inicio: '', fin: '' },
            { id: 15, alias: 5, nombre: 'Bloque 5', duracion: 40, inicio: '', fin: '' },
            { id: 16, alias: 6, nombre: 'Bloque 6', duracion: 40, inicio: '', fin: '' },
            { id: 17, alias: 7, nombre: 'Bloque 7', duracion: 45, inicio: '', fin: '' },
        ]
    },
    {
        id: 3,
        descripcion: "Jornada Tarde Normal",
        timeOfDay: 'afternoon',
        tipo: 'normal',
        startTime: '13:00',
        bloques: [
            { id: 18, alias: 1, nombre: 'Bloque 1', duracion: 45, inicio: '', fin: '' },
            { id: 19, alias: 2, nombre: 'Bloque 2', duracion: 45, inicio: '', fin: '' },
            { id: 20, alias: 3, nombre: 'Bloque 3', duracion: 45, inicio: '', fin: '' },
            { id: 21, alias: 'd', nombre: 'Descanso', duracion: 30, inicio: '', fin: '' },
            { id: 22, alias: 4, nombre: 'Bloque 4', duracion: 45, inicio: '', fin: '' },
            { id: 23, alias: 5, nombre: 'Bloque 5', duracion: 45, inicio: '', fin: '' },
            { id: 24, alias: 6, nombre: 'Bloque 6', duracion: 45, inicio: '', fin: '' },
        ]
    },
    {
        id: 4,
        descripcion: "Jornada Tarde Especial",
        timeOfDay: 'afternoon',
        tipo: 'especial',
        startTime: '13:00',
        bloques: [
            { id: 25, alias: 1, nombre: 'Bloque 1', duracion: 40, inicio: '', fin: '' },
            { id: 26, alias: 2, nombre: 'Bloque 2', duracion: 40, inicio: '', fin: '' },
            { id: 27, alias: 3, nombre: 'Bloque 3', duracion: 40, inicio: '', fin: '' },
            { id: 28, alias: 'd', nombre: 'Descanso', duracion: 30, inicio: '', fin: '' },
            { id: 29, alias: 4, nombre: 'Bloque 4', duracion: 40, inicio: '', fin: '' },
            { id: 30, alias: 5, nombre: 'Bloque 5', duracion: 40, inicio: '', fin: '' },
            { id: 31, alias: 6, nombre: 'Bloque 6', duracion: 35, inicio: '', fin: '' }, // Reordered
            { id: 32, alias: 7, nombre: 'Direccion de Grupo', duracion: 35, inicio: '', fin: '' }, // Reordered
        ]
    }
];

const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
}

function App() {
    const [jornadaSettings, setJornadaSettings] = useState<{ morning: 'normal' | 'especial', afternoon: 'normal' | 'especial' }>({ morning: 'normal', afternoon: 'normal' });
    const [allJornadas, setAllJornadas] = useState<Jornada[]>(JORNADAS_DATA);
    const [processedJornadas, setProcessedJornadas] = useState<Jornada[]>([]);
    const [activeJornada, setActiveJornada] = useState<Jornada | undefined>();
    const [showConfig, setShowConfig] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [currentBlock, setCurrentBlock] = useState<{ block: Bloque, index: number } | undefined>();

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    // Effect to recalculate block times whenever the base jornada data changes
    useEffect(() => {
        const calculatedJornadas = allJornadas.map(jornada => {
            let startTime = timeToMinutes(jornada.startTime);
            const calculatedBloques = jornada.bloques.map(bloque => {
                const endTime = startTime + bloque.duracion;
                const newBlock = {
                    ...bloque,
                    inicio: minutesToTime(startTime),
                    fin: minutesToTime(endTime)
                };
                startTime = endTime;
                return newBlock;
            });
            return { ...jornada, bloques: calculatedBloques };
        });
        setProcessedJornadas(calculatedJornadas);
        console.log("Processed Jornadas:", calculatedJornadas); // Debug log
    }, [allJornadas]);

    // Effect to determine the active jornada and current block with its index
    useEffect(() => {
        const currentHour = currentTime.getHours();
        const timeOfDay = currentHour < 13 ? 'morning' : 'afternoon';
        const tipo = jornadaSettings[timeOfDay];

        const foundJornada = processedJornadas.find(j => j.timeOfDay === timeOfDay && j.tipo === tipo);
        setActiveJornada(foundJornada);

        if (foundJornada) {
            const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
            const currentBlockIndex = foundJornada.bloques.findIndex(b => {
                const startMinutes = timeToMinutes(b.inicio!);
                const endMinutes = timeToMinutes(b.fin!);
                return currentMinutes >= startMinutes && currentMinutes < endMinutes;
            });

            if (currentBlockIndex !== -1) {
                setCurrentBlock({ block: foundJornada.bloques[currentBlockIndex], index: currentBlockIndex });
                console.log("Current Block (with index):", { block: foundJornada.bloques[currentBlockIndex], index: currentBlockIndex }); // Debug log
            } else {
                setCurrentBlock(undefined);
            }
        } else {
            setCurrentBlock(undefined);
        }

    }, [currentTime, jornadaSettings, processedJornadas]);

    const handleConfigClick = () => {
        const password = prompt("Ingrese la contraseña para configurar:");
        if (password === "1234") {
            setShowConfig(true);
        } else {
            alert("Contraseña incorrecta.");
        }
    };
    
    const getBlockNumber = () => {
        if (currentBlock) {
            return currentBlock.block.alias;
        }

        // If no current block, check if it's "fin de jornada"
        if (activeJornada) {
            const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
            const lastBlock = activeJornada.bloques[activeJornada.bloques.length - 1];
            if (lastBlock) {
                const lastBlockEndMinutes = timeToMinutes(lastBlock.fin!);
                if (currentMinutes >= lastBlockEndMinutes) {
                    return 'f'; // Fin de jornada
                }
            }
        }

        return ''; // Default if no block and not fin de jornada
    }

    return (
        <div className="app-container">
            <header className="header">
                <h1 className="header-title">APEX</h1>
                <h2 className="header-subtitle">TimeAC</h2>
            </header>

            <div className="grid-container">
                <div className="glass-card clock-card">
                    <div className="block-number">{getBlockNumber()}</div>
                    <Clock />
                    {activeJornada && (
                        <div className="current-jornada-display">
                            {activeJornada.descripcion}
                        </div>
                    )}
                </div>

                <ViewHorarios 
                    jornada={activeJornada}
                    bloques={activeJornada?.bloques || []}
                    currentBlock={currentBlock}
                />
            </div>

            <button className="config-button" onClick={handleConfigClick}>
                Configurar
            </button>

            {showConfig && activeJornada && (
                <ConfigView 
                    jornadaSettings={jornadaSettings}
                    setJornadaSettings={setJornadaSettings}
                    allJornadas={allJornadas}
                    setAllJornadas={setAllJornadas}
                    onClose={() => setShowConfig(false)} 
                />
            )}
        </div>
    );
}

export default App;