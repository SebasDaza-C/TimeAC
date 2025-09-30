import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Db } from '../firebaseClient';
import type { Schedule } from '../Types';

export function UseJornadas() {
  const [Jornadas, SetJornadas] = useState<Schedule[]>([]);
  const [Loading, SetLoading] = useState<boolean>(true);
  const [ErrorState, SetErrorState] = useState<Error | null>(null);

  useEffect(() => {
    let Mounted = true;

    async function Load() {
      SetLoading(true);
      try {
        const Snapshot = await getDocs(collection(Db, 'jornadas'));
  const Data = Snapshot.docs.map((d) => d.data() as Schedule);
  if (Mounted) SetJornadas(Data as Schedule[]);
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

  return { Jornadas, Loading, ErrorState };
}
