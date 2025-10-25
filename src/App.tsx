import React, { useEffect, useState } from 'react';
import { Clock } from './components/Clock';
import { ConfigView } from './components/ConfigView';
import { PasswordView } from './components/PasswordView';
import { ViewSchedules } from './components/ViewSchedules';
import { UseStore } from './Store';
import { UseSchedules } from './hooks/UseSchedules';
import type { Schedule, Block } from './Types';
import { ref, set, get, onValue, update } from 'firebase/database';
import { Db, AppClient } from './firebaseClient';

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
  const { Schedules, Loading } = UseSchedules();
  const SetAllSchedules = UseStore((state) => state.SetAllSchedules);
  const ScheduleSettings = UseStore((state) => state.ScheduleSettings);
  const AllSchedules = UseStore((state) => state.AllSchedules);

  const [ActiveSchedule, SetActiveSchedule] = useState<Schedule | undefined>(undefined);
  const [ShowConfig, SetShowConfig] = useState(false);
  const [ShowPasswordView, SetShowPasswordView] = useState(false);
  const [PasswordError, SetPasswordError] = useState('');
  const [RemotePassword, SetRemotePassword] = useState<string | null>(null);
  const [CurrentTime, SetCurrentTime] = useState(new Date());
  const [CurrentBlock, SetCurrentBlock] = useState<{ block: Block; index: number } | undefined>(
    undefined,
  );

  useEffect(() => {
    // The UseSchedules hook is now the single source of truth for schedules.
    // When it provides new data (from Realtime Database), we update the global store.
    // The hook handles loading and error states internally.
    SetAllSchedules(Schedules);
  }, [Schedules, SetAllSchedules]);

  // Database auto-initialization
  useEffect(() => {
    // If loading is finished and there are no schedules, the database is empty.
    // Let's populate it with default data from the local JSON file.
    const initializeDatabase = async () => {
      console.log('[App] No schedules found. Initializing database with default data...');
      try {
        // 1. Fetch the source of truth from the public JSON file
        const res = await fetch('/Schedules.json');
        if (!res.ok) throw new Error(`Cannot fetch Schedules.json: ${res.statusText}`);
        const newSchedules = await res.json();

        // 2. Convert array to an object for RTDB
        const schedulesObject = newSchedules.reduce((acc: any, schedule: Schedule) => {
          acc[schedule.id] = schedule;
          return acc;
        }, {});

        // 3. Prepare updates for different paths
        const updates: { [key: string]: any } = {};
        updates['/jornadas'] = schedulesObject;
        updates['/settings/password'] = '1234'; // Set a default password

        // 4. Perform a multi-path update
        await update(ref(Db), updates);
        console.log('[App] Database initialized successfully.');
      } catch (err) {
        console.error('Error initializing database:', err);
      }
    };

    if (!Loading && Schedules.length === 0) {
      initializeDatabase();
    }
  }, [Loading, Schedules]);

  // tick
  useEffect(() => {
    const id = setInterval(() => SetCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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

  // This new useEffect will write the current alias to Realtime Database
  // whenever the active block changes. This is for the ESP32 to read.
  useEffect(() => {
    const alias = CurrentBlock?.block.alias || 'F';
    const statusRef = ref(Db, 'status/display/currentAlias');
    set(statusRef, alias);
  }, [CurrentBlock]);

  // Listen for password changes in real-time for debug/instant update
  useEffect(() => {
    const passwordRef = ref(Db, 'settings/password');
    const unsub = onValue(
      passwordRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val !== null) {
          console.log('[App] settings/password snapshot:', val);
          SetRemotePassword(val);
        } else {
          console.log('[App] settings/password snapshot: path does not exist');
          SetRemotePassword(null);
        }
      },
      (err) => console.error('[App] settings/password snapshot error', err),
    );

    return () => unsub();
  }, []);

  const HandleConfigClick = () => SetShowPasswordView(true);

  const HandlePasswordSubmit = async (password: string) => {
    try {
      const passwordRef = ref(Db, 'settings/password');
      const passwordSnapshot = await get(passwordRef);
      const storedPassword = passwordSnapshot.exists() ? passwordSnapshot.val() : '1234';

      if (password === storedPassword) {
        SetShowPasswordView(false);
        SetShowConfig(true);
        SetPasswordError('');
      } else {
        SetPasswordError('Contraseña incorrecta.');
      }
    } catch (err) {
      console.error('Error fetching password:', err);
      SetPasswordError('Error al verificar la contraseña. Revisa la consola para más detalles.');
    }
  };

  const HandleSaveSettings = async (
    newSchedules: Schedule[],
    newSettings: { Morning: 'Normal' | 'Special'; Afternoon: 'Normal' | 'Special' },
  ) => {
    try {
      // With Realtime Database, we can overwrite the entire 'jornadas' node.
      // We'll structure it as an object with schedule.id as keys for easier lookup.
      const schedulesObject = newSchedules.reduce((acc, schedule) => {
        acc[schedule.id] = schedule;
        return acc;
      }, {} as { [id: number]: Schedule });
      await set(ref(Db, 'jornadas'), schedulesObject);

      // No need to call SetAllSchedules here, onSnapshot will do it
      UseStore.setState({ ScheduleSettings: newSettings });
      SetShowConfig(false);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Error al guardar la configuración. Revisa la consola para más detalles.');
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
          ClassName={ShowConfig ? 'show' : ''}
        />
      )}
    </div>
  );
}
