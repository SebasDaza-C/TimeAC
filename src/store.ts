import { create } from 'zustand';
import type { Jornada } from './types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase'; // Import the db instance from your firebase config

// The initial data that will be uploaded to Firestore if it's empty.
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
            { id: 31, alias: 6, nombre: 'Bloque 6', duracion: 35, inicio: '', fin: '' },
            { id: 32, alias: 7, nombre: 'Direccion de Grupo', duracion: 35, inicio: '', fin: '' },
        ]
    }
];


interface AppState {
    jornadaSettings: { morning: 'normal' | 'especial', afternoon: 'normal' | 'especial' };
    allJornadas: Jornada[];
    setJornadaSettings: (settings: AppState['jornadaSettings']) => Promise<void>;
    setAllJornadas: (jornadas: Jornada[]) => Promise<void>;
    initialLoad: () => Promise<void>; // Function to seed initial data
}

export const useStore = create<AppState>((set) => ({
    jornadaSettings: { morning: 'normal', afternoon: 'normal' },
    allJornadas: [], // Start with empty data
    setJornadaSettings: async (settings) => {
        try {
            await setDoc(doc(db, "config", "jornadaSettings"), settings);
            set({ jornadaSettings: settings });
        } catch (e) {
            console.error("Error updating jornadaSettings: ", e);
        }
    },
    setAllJornadas: async (jornadas) => {
        try {
            // We store the array of jornadas within a single document.
            await setDoc(doc(db, "config", "allJornadas"), { list: jornadas });
            set({ allJornadas: jornadas });
        } catch (e) {
            console.error("Error updating allJornadas: ", e);
        }
    },
    initialLoad: async () => {
        // This function can be called once to seed the database with initial data.
        try {
            await setDoc(doc(db, "config", "allJornadas"), { list: JORNADAS_DATA });
            set({ allJornadas: JORNADAS_DATA });
            console.log("Initial data loaded to Firestore.");
        } catch (e) {
            console.error("Error loading initial data: ", e);
        }
    }
}));