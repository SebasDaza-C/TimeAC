import { create } from 'zustand';
import type { Schedule } from './Types';

interface AppState {
  ScheduleSettings: { Morning: 'Normal' | 'Special'; Afternoon: 'Normal' | 'Special' };
  AllSchedules: Schedule[];
  SetScheduleSettings: (settings: AppState['ScheduleSettings']) => void;
  SetAllSchedules: (schedules: Schedule[]) => void;
}

export const UseStore = create<AppState>((set) => ({
  ScheduleSettings: { Morning: 'Normal', Afternoon: 'Normal' },
  AllSchedules: [],
  SetScheduleSettings: (settings) => set({ ScheduleSettings: settings }),
  SetAllSchedules: (schedules) => set({ AllSchedules: schedules }),
}));
