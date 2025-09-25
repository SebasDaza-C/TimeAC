import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Clock } from './components/Clock';
import { ConfigView } from './components/ConfigView';
import { ViewHorarios } from './components/ViewHorarios';
import { PasswordView } from './components/PasswordView';
import type { Jornada, Bloque } from './types';
import { useStore } from './store';

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
    const { jornadaSettings, allJornadas, setJornadaSettings, setAllJornadas } = useStore();
    const [processedJornadas, setProcessedJornadas] = useState<Jornada[]>([]);
    const [activeJornada, setActiveJornada] = useState<Jornada | undefined>();
    const [showConfig, setShowConfig] = useState(false);
    const [showPasswordView, setShowPasswordView] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [currentBlock, setCurrentBlock] = useState<{ block: Bloque, index: number } | undefined>();

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    // Effect to listen for real-time updates from Firestore
    useEffect(() => {
        const { setJornadaSettings, setAllJornadas, initialLoad } = useStore.getState();

        const settingsDocRef = doc(db, "config", "jornadaSettings");
        const jornadasDocRef = doc(db, "config", "allJornadas");

        const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setJornadaSettings(docSnap.data() as any);
            }
        });

        const unsubJornadas = onSnapshot(jornadasDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data && data.list) {
                    setAllJornadas(data.list);
                }
            } else {
                // If the document doesn't exist, seed the database
                console.log("No jornada data found in Firestore, loading initial data...");
                initialLoad();
            }
        });

        // Cleanup listeners on component unmount
        return () => {
            unsubSettings();
            unsubJornadas();
        };
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
            } else {
                setCurrentBlock(undefined);
            }
        } else {
            setCurrentBlock(undefined);
        }

    }, [currentTime, jornadaSettings, processedJornadas]);

    const handleConfigClick = () => {
        setShowPasswordView(true);
    };

    const handlePasswordSubmit = (password: string) => {
        const storedPassword = localStorage.getItem('timeac-password') || '1234';
        if (password === storedPassword) {
            setShowConfig(true);
            setShowPasswordView(false);
            setPasswordError('');
        } else {
            setPasswordError("Contraseña incorrecta.");
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
                    <div key={getBlockNumber()} className="block-number">{getBlockNumber()}</div>
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

            {showPasswordView && (
                <PasswordView 
                    onClose={() => setShowPasswordView(false)}
                    onSubmit={handlePasswordSubmit}
                    error={passwordError}
                    className={showPasswordView ? 'show' : ''}
                />
            )}

            {showConfig && activeJornada && (
                <ConfigView 
                    jornadaSettings={jornadaSettings}
                    setJornadaSettings={setJornadaSettings}
                    allJornadas={allJornadas}
                    setAllJornadas={setAllJornadas}
                    onClose={() => setShowConfig(false)} 
                    className={showConfig ? 'show' : ''}
                />
            )}
        </div>
    );
}

export default App;