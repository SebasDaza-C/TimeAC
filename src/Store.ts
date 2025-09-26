import { create } from 'zustand';
import type { Jornada } from './Types';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './Firebase'; // Import the db instance from your firebase config

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
        const jornadasDocRef = doc(db, "config", "allJornadas");
        const docSnap = await getDoc(jornadasDocRef);

        if (!docSnap.exists() || !docSnap.data()?.list) {
            console.log("No jornada data found in Firestore. Attempting to load from jornadas.json.");
            try {
                const response = await fetch('/jornadas.json');
                const JORNADAS_DATA: Jornada[] = await response.json();
                await setDoc(jornadasDocRef, { list: JORNADAS_DATA });
                set({ allJornadas: JORNADAS_DATA });
                console.log("Initial data loaded from jornadas.json to Firestore.");
            } catch (e) {
                console.error("Error loading initial data from jornadas.json: ", e);
            }
        } else {
            set({ allJornadas: docSnap.data()?.list as Jornada[] });
            console.log("Jornada data loaded from Firestore.");
        }
    }
}));