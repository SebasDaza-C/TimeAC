import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Db, AppClient } from '../firebaseClient';
import type { Schedule } from '../Types';

export function UseSchedules() {
  const [Schedules, SetSchedules] = useState<Schedule[]>([]);
  const [Loading, SetLoading] = useState<boolean>(true);
  const [ErrorState, SetErrorState] = useState<unknown | null>(null);
  const [isResetting, setIsResetting] = useState(false);

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

  /**
   * Llama a la Cloud Function 'resetJornadas' para reestablecer los horarios
   * a su estado original desde el archivo Schedules.json.
   */
  const resetSchedules = async () => {
    setIsResetting(true);
    try {
      const functions = getFunctions(AppClient);
      const resetJornadas = httpsCallable(functions, 'resetJornadas');
      const result = await resetJornadas();
      console.log('[UseSchedules] Reset successful:', result.data);
    } catch (error) {
      console.error('[UseSchedules] Error calling resetJornadas:', error);
      SetErrorState(error);
    } finally {
      setIsResetting(false);
    }
  };

  return { Schedules, Loading, ErrorState, resetSchedules, isResetting };
}
