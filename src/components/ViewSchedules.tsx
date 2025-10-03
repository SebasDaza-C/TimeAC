import React from 'react';
import type { Block, Schedule } from '../Types';

interface Props {
  Schedule?: Schedule;
  Blocks: Block[];
  CurrentBlock?: { Block: Block; Index: number };
}

export function ViewSchedules({ Schedule, Blocks, CurrentBlock }: Props) {
  if (!Schedule) {
    return (
      <div className="glass-card schedule-card no-schedule-card">
        <h2 className="schedule-title">Fuera de Horario</h2>
        <div className="no-schedule-content">
          <i className="bx bxs-moon no-schedule-icon"></i>
          <p>No hay clases en este momento. ¡Disfruta tu descanso!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card schedule-card">
      <h2 key={Schedule.id} className="schedule-title">
        {Schedule.description}
      </h2>
      <ul className="schedule-list">
        {Blocks.map((BlockItem, Index) => (
          <li
            key={BlockItem.id}
            className={`schedule-item ${CurrentBlock?.Index === Index ? 'active' : ''}`}
          >
            <div className="schedule-item-content">
              <div className="schedule-item-header">
                <span className="block-name">{BlockItem.name}</span>
                <span className="block-number-display">{BlockItem.alias}</span>
              </div>
              <div className="block-details">
                <span className="block-time">
                  {BlockItem.start} - {BlockItem.end}
                </span>
                <span className="block-duration">({BlockItem.duration} min)</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
