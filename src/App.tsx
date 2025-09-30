import React, { useEffect, useState } from 'react';
import { Clock } from './components/Clock';
import { ConfigView } from './components/ConfigView';
import { PasswordView } from './components/PasswordView';
import { ViewSchedules } from './components/ViewSchedules';
import { UseStore } from './Store';
import { UseSchedules } from './hooks/UseSchedules';
import type { Schedule, Block } from './Types';

const LOCAL_STORAGE_KEY = 'timeac-schedules';

const TimeToMinutes = (time: string) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const MinutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
};

export default function App() {
  const { Schedules } = UseSchedules();
  const SetAllSchedules = UseStore((state) => state.SetAllSchedules);
  const ScheduleSettings = UseStore((state) => state.ScheduleSettings);
  const AllSchedules = UseStore((state) => state.AllSchedules);

  const [ActiveSchedule, SetActiveSchedule] = useState<Schedule | undefined>(undefined);
  const [ShowConfig, SetShowConfig] = useState(false);
  const [ShowPasswordView, SetShowPasswordView] = useState(false);
  const [PasswordError, SetPasswordError] = useState('');
  const [CurrentTime, SetCurrentTime] = useState(new Date());
  const [CurrentBlock, SetCurrentBlock] = useState<{ block: Block; index: number } | undefined>(
    undefined,
  );

  // Load schedules from localStorage or Firestore/jornadas
  useEffect(() => {
    const loadInitial = async () => {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            SetAllSchedules(parsed as Schedule[]);
            return;
          }
        } catch (e) {
          /* ignore */
        }
      }

      if (Schedules && Schedules.length > 0) {
        SetAllSchedules(Schedules as Schedule[]);
        return;
      }

      // Fallback to public/Schedules.json
      try {
        const res = await fetch('/Schedules.json');
        const data = await res.json();
        SetAllSchedules(data);
      } catch (e) {
        // ignore
      }
    };
    loadInitial();
  }, [Schedules, SetAllSchedules]);

  // tick
  useEffect(() => {
    const id = setInterval(() => SetCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // persist
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(AllSchedules));
  }, [AllSchedules]);

  // determine active schedule and current block
  useEffect(() => {
    const currentHour = CurrentTime.getHours();
    const TimeOfDay: 'Morning' | 'Afternoon' = currentHour < 13 ? 'Morning' : 'Afternoon';
    const ActiveType = ScheduleSettings[TimeOfDay];

    const Found = AllSchedules.find((s) => s.timeOfDay === TimeOfDay && s.type === ActiveType);

    if (Found) {
      let start = TimeToMinutes(Found.startTime);
      const calcBlocks = Found.blocks.map((b) => {
        const end = start + b.duration;
        const nb = { ...b, start: MinutesToTime(start), end: MinutesToTime(end) };
        start = end;
        return nb;
      });

      const processed = { ...Found, blocks: calcBlocks };
      SetActiveSchedule(processed);

      const currentMinutes = CurrentTime.getHours() * 60 + CurrentTime.getMinutes();
      const idx = processed.blocks.findIndex((b) => {
        const s = TimeToMinutes(b.start!);
        const e = TimeToMinutes(b.end!);
        return currentMinutes >= s && currentMinutes < e;
      });

      if (idx !== -1) SetCurrentBlock({ block: processed.blocks[idx], index: idx });
      else {
        SetCurrentBlock(undefined);
        const last = processed.blocks[processed.blocks.length - 1];
        if (currentMinutes >= TimeToMinutes(last?.end || '00:00')) SetActiveSchedule(undefined);
      }
    } else {
      SetActiveSchedule(undefined);
      SetCurrentBlock(undefined);
    }
  }, [CurrentTime, AllSchedules, ScheduleSettings]);

  const HandleConfigClick = () => SetShowPasswordView(true);

  const HandlePasswordSubmit = (password: string) => {
    const stored = localStorage.getItem('timeac-password') || '1234';
    if (password === stored) {
      SetShowPasswordView(false);
      SetShowConfig(true);
      SetPasswordError('');
    } else {
      SetPasswordError('Incorrect password.');
    }
  };

  const HandleSaveSettings = (
    newSchedules: Schedule[],
    newSettings: { Morning: 'Normal' | 'Special'; Afternoon: 'Normal' | 'Special' },
  ) => {
    SetAllSchedules(newSchedules);
    UseStore.setState({ ScheduleSettings: newSettings });
    SetShowConfig(false);
  };

  const HandleResetSettings = async () => {
    try {
      const res = await fetch('/Schedules.json');
      const data = await res.json();
      SetAllSchedules(data);
      UseStore.setState({ ScheduleSettings: { Morning: 'Normal', Afternoon: 'Normal' } });
    } catch (e) {
      /* ignore */
    }
  };

  const GetBlockNumber = () => CurrentBlock?.block.alias || 'F';

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>TimeAC</h1>
      </header>

      <div className="main-content">
        <div className="clock-container">
          <div className="block-number">{GetBlockNumber()}</div>
          <div className="schedule-description">
            {CurrentBlock ? CurrentBlock.block.name : 'Fuera de Horario'}
          </div>
          <Clock />
        </div>

        <ViewSchedules
          Schedule={ActiveSchedule}
          Blocks={ActiveSchedule?.blocks || []}
          CurrentBlock={
            CurrentBlock ? { Block: CurrentBlock.block, Index: CurrentBlock.index } : undefined
          }
        />
      </div>

      <button className="config-button" onClick={HandleConfigClick}>
        <i className="bx bx-cog"></i>
      </button>

      {ShowPasswordView && (
        <PasswordView
          OnClose={() => SetShowPasswordView(false)}
          OnSubmit={HandlePasswordSubmit}
          ErrorMessage={PasswordError}
          ClassName={ShowPasswordView ? 'show' : ''}
        />
      )}

      {ShowConfig && (
        <ConfigView
          ScheduleSettings={ScheduleSettings}
          AllSchedules={AllSchedules}
          OnSaveAndClose={HandleSaveSettings}
          OnCloseWithoutSaving={() => SetShowConfig(false)}
          OnReset={HandleResetSettings}
          ClassName={ShowConfig ? 'show' : ''}
        />
      )}
    </div>
  );
}
