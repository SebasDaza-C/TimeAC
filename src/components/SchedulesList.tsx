import React from 'react';
import { UseSchedules } from '../hooks/UseSchedules';
import type { Schedule } from '../Types';

export default function SchedulesList() {
  const { Schedules, Loading, ErrorState } = UseSchedules();

  if (Loading) return <div>Cargando horarios...</div>;
  if (ErrorState) return <div>Error cargando horarios: {String(ErrorState)}</div>;

  return (
    <div>
      <h3>Horarios</h3>
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
