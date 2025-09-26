export interface Bloque {
    id: number;
    alias: number | string; // Añadido: alias para el bloque, puede ser número o string
    nombre: string;
    duracion: number; // duration in minutes
    inicio: string; // Will be calculated
    fin: string; // Will be calculated
}

export interface Jornada {
    id: number;
    descripcion: string;
    timeOfDay: 'morning' | 'afternoon';
    tipo: 'normal' | 'especial';
    startTime: string; // e.g., "08:00"
    bloques: Bloque[];
}
