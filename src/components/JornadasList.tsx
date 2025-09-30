import React from 'react';
import { UseSchedules } from '../hooks/UseSchedules';
import type { Schedule } from '../Types';

export default function JornadasList() {
  const { Schedules, Loading, ErrorState } = UseSchedules();

  if (Loading) return <div>Cargando jornadas...</div>;
  if (ErrorState) return <div>Error cargando jornadas: {String(ErrorState)}</div>;

  return (
    <div>
      <h3>Jornadas</h3>
      <ul>
        {Schedules.map((s: Schedule) => (
          <li key={s.id}>
            {s.description} ({s.timeOfDay})
          </li>
        ))}
      </ul>
    </div>
  );
}
