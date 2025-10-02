import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Db } from '../firebaseClient';
import type { Schedule } from '../Types';

export function UseJornadas() {
  const [Jornadas, SetJornadas] = useState<Schedule[]>([]);
  const [Loading, SetLoading] = useState<boolean>(true);
  const [ErrorState, SetErrorState] = useState<Error | null>(null);

  useEffect(() => {
    SetLoading(true);
    const unsub = onSnapshot(
      collection(Db, 'jornadas'),
      (snapshot) => {
        const Data = snapshot.docs.map((d) => d.data() as Schedule);
        SetJornadas(Data);
        SetLoading(false);
      },
      (err) => {
        SetErrorState(err);
        SetLoading(false);
      }
    );

    return () => {
      unsub();
    };
  }, []);

  return { Jornadas, Loading, ErrorState };
}
