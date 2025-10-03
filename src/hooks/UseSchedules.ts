import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Db } from '../firebaseClient';
import type { Schedule } from '../Types';

export function UseSchedules() {
  const [Schedules, SetSchedules] = useState<Schedule[]>([]);
  const [Loading, SetLoading] = useState<boolean>(true);
  const [ErrorState, SetErrorState] = useState<Error | null>(null);

  useEffect(() => {
    SetLoading(true);
    const unsub = onSnapshot(
      collection(Db, 'jornadas'),
      (snapshot) => {
        console.log('[UseSchedules] onSnapshot received', snapshot.docs.length, 'docs');
        const Data = snapshot.docs.map((d) => d.data() as Schedule);
        SetSchedules(Data);
        SetLoading(false);
      },
      (err) => {
        console.error('[UseSchedules] onSnapshot error', err);
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
