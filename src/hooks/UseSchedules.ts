import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { Db } from '../firebaseClient';
import type { Schedule } from '../Types';

export function UseSchedules() {
  const [Schedules, SetSchedules] = useState<Schedule[]>([]);
  const [Loading, SetLoading] = useState<boolean>(true);
  const [ErrorState, SetErrorState] = useState<unknown | null>(null);

  useEffect(() => {
    SetLoading(true);
    const schedulesRef = ref(Db, 'jornadas');
    const unsub = onValue(
      schedulesRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Realtime Database devuelve un objeto, lo convertimos a un array
          const schedulesArray = Object.values(data) as Schedule[];
          console.log('[UseSchedules] onValue received', schedulesArray.length, 'schedules');
          SetSchedules(schedulesArray);
        } else {
          SetSchedules([]);
        }
        SetLoading(false);
      },
      (err) => {
        console.error('[UseSchedules] onValue error', err);
        SetErrorState(err);
        SetLoading(false);
      }
    );

    return () => {
      unsub();
    };
  }, []);

  return { Schedules, Loading, ErrorState };
}
