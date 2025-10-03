import React, { useEffect, useState } from 'react';
import { Clock } from './components/Clock';
import { ConfigView } from './components/ConfigView';
import { PasswordView } from './components/PasswordView';
import { ViewSchedules } from './components/ViewSchedules';
import { UseStore } from './Store';
import { UseSchedules } from './hooks/UseSchedules';
import type { Schedule, Block } from './Types';
import { collection, doc, getDocs, writeBatch, setDoc, getDoc } from 'firebase/firestore';
import { Db } from './firebaseClient';

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
      // 1) If Firestore has schedules (real-time listener), prefer them.
      if (Schedules && Schedules.length > 0) {
        SetAllSchedules(Schedules as Schedule[]);
        return;
      }

      // 2) If no schedules yet from Firestore, try localStorage as a temporary fallback
      //    so the UI can show something immediately. Do NOT return here — when Schedules
      //    later arrive the effect will re-run and replace this value with the live data.
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            SetAllSchedules(parsed as Schedule[]);
            // do not return: allow Firestore Schedules to overwrite when available
          }
        } catch (e) {
          /* ignore malformed localStorage */
        }
      }

      // 3) Fallback to public/Schedules.json only if we still don't have any schedules.
      if ((!stored || stored === 'null') && (!Schedules || Schedules.length === 0)) {
        try {
          const res = await fetch('/Schedules.json');
          if (res.ok) {
            const data = await res.json();
            SetAllSchedules(data);
          }
        } catch (e) {
          // ignore
        }
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

  // This new useEffect will write the current alias to Firestore
  // whenever the active block changes. This is for the ESP32 to read.
  useEffect(() => {
    const alias = CurrentBlock?.block.alias || 'F';
    const statusRef = doc(Db, 'status', 'display');
    setDoc(statusRef, { currentAlias: alias });
  }, [CurrentBlock]);

  const HandleConfigClick = () => SetShowPasswordView(true);

  const HandlePasswordSubmit = async (password: string) => {
    try {
      const passwordRef = doc(Db, 'settings', 'password');
      const passwordDoc = await getDoc(passwordRef);
      const storedPassword = passwordDoc.exists() ? passwordDoc.data().value : '1234';

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
      const batch = writeBatch(Db);
      const collectionRef = collection(Db, 'jornadas');

      // Delete existing documents not in newSchedules
      const existingDocsSnapshot = await getDocs(collectionRef);
      existingDocsSnapshot.forEach((doc) => {
        if (!newSchedules.some((s) => String(s.id) === doc.id)) {
          batch.delete(doc.ref);
        }
      });

      // Set new/updated documents
      newSchedules.forEach((schedule) => {
        const docRef = doc(Db, 'jornadas', String(schedule.id));
        batch.set(docRef, schedule);
      });

      await batch.commit();

      // No need to call SetAllSchedules here, onSnapshot will do it
      UseStore.setState({ ScheduleSettings: newSettings });
      SetShowConfig(false);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Error al guardar la configuración. Revisa la consola para más detalles.');
    }
  };

  const HandleResetSettings = async () => {
    // This function will reset the entire Firestore 'jornadas' collection
    // to the state defined in the local `public/Schedules.json`.
    // NOTE: This client-side implementation requires open write permissions
    // on the 'jornadas' collection. For production, this logic should be
    // moved to a secure backend environment (e.g., a Firebase Cloud Function).
    if (
      !window.confirm(
        '¿Estás seguro de que quieres restablecer la base de datos? Esta acción afectará a todos los usuarios.',
      )
    ) {
      return;
    }

    alert('Restableciendo la base de datos... Esto puede tardar un momento.');

    try {
      // 1. Fetch the source of truth from the public JSON file
      const res = await fetch('/Schedules.json');
      if (!res.ok) {
        throw new Error(`Cannot fetch Schedules.json: ${res.statusText}`);
      }
      const newSchedules = await res.json();

      // 2. Get a reference to the collection
      const collectionRef = collection(Db, 'jornadas');

      // 3. Create a batch to perform atomic operations
      const batch = writeBatch(Db);

      // 4. Delete all existing documents in the collection
      const existingDocsSnapshot = await getDocs(collectionRef);
      existingDocsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 5. Add the new documents from the JSON file
      newSchedules.forEach((schedule: Schedule) => {
        const docRef = doc(Db, 'jornadas', String(schedule.id));
        batch.set(docRef, schedule);
      });

      // 6. Commit the batch
      await batch.commit();

      // 7. Reset local UI state for settings
      UseStore.setState({ ScheduleSettings: { Morning: 'Normal', Afternoon: 'Normal' } });

      alert('¡Base de datos restablecida con éxito!');
    } catch (err) {
      console.error('Error resetting database:', err);
      alert(
        `Error al restablecer la base de datos. Es posible que no tengas los permisos necesarios. Revisa la consola para más detalles.`,
      );
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
