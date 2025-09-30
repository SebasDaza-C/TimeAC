import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Db } from '../firebaseClient';
import type { Schedule } from '../Types';

export function UseSchedules() {
  const [Schedules, SetSchedules] = useState<Schedule[]>([]);
  const [Loading, SetLoading] = useState<boolean>(true);
  const [ErrorState, SetErrorState] = useState<Error | null>(null);

  useEffect(() => {
    let Mounted = true;

    async function Load() {
      SetLoading(true);
      try {
        const Snapshot = await getDocs(collection(Db, 'jornadas'));
  const Data = Snapshot.docs.map((d) => d.data() as Schedule);
  if (Mounted) SetSchedules(Data as Schedule[]);
      } catch (Err) {
        if (Mounted) SetErrorState(Err);
      } finally {
        if (Mounted) SetLoading(false);
      }
    }

    Load();

    return () => {
      Mounted = false;
    };
  }, []);

  return { Schedules, Loading, ErrorState };
}
