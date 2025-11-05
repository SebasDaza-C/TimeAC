export interface Block {
  id: number;
  alias: number | string; // alias can be number or string
  name: string;
  duration: number; // duration in minutes
  start: string; // Will be calculated
  end: string; // Will be calculated
}

export interface Schedule {
  id: number;
  description: string;
  timeOfDay: 'Morning' | 'Afternoon';
  type: 'Normal' | 'Special';
  startTime: string;
  blocks: Block[];
}

export interface BellControls {
  isRinging: boolean;
  autoRingEnabled: boolean;
  isSilenced: boolean;
}