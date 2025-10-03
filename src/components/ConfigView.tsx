import { useState, useEffect } from 'react';
import type { Block, Schedule } from '../Types';

interface Props {
  ScheduleSettings: { Morning: 'Normal' | 'Special'; Afternoon: 'Normal' | 'Special' };
  AllSchedules: Schedule[];
  OnSaveAndClose: (
    Schedules: Schedule[],
    Settings: { Morning: 'Normal' | 'Special'; Afternoon: 'Normal' | 'Special' },
  ) => void;
  OnCloseWithoutSaving: () => void;
  OnReset: () => void;
  ClassName?: string;
}

export function ConfigView({
  ScheduleSettings,
  AllSchedules,
  OnSaveAndClose,
  OnCloseWithoutSaving,
  OnReset,
  ClassName,
}: Props) {
  const [LocalSchedules, SetLocalSchedules] = useState(AllSchedules);
  const [LocalSettings, SetLocalSettings] = useState(ScheduleSettings);
  const [SelectedScheduleId, SetSelectedScheduleId] = useState<number>(LocalSchedules[0]?.id || 0);
  const [NewPassword, SetNewPassword] = useState('');
  const [ConfirmPassword, SetConfirmPassword] = useState('');
  const [PasswordMessage, SetPasswordMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);
  const [ShowResetConfirm, SetShowResetConfirm] = useState(false);

  useEffect(() => {
    if (LocalSchedules.length > 0) {
      const SelectedExists = LocalSchedules.some((j) => j.id === SelectedScheduleId);
      if (!SelectedExists) SetSelectedScheduleId(LocalSchedules[0].id);
    }
  }, [LocalSchedules, SelectedScheduleId]);

  const HandleScheduleTypeToggle = (TimeOfDay: 'Morning' | 'Afternoon') => {
    const NewType = LocalSettings[TimeOfDay] === 'Normal' ? 'Special' : 'Normal';
    SetLocalSettings({ ...LocalSettings, [TimeOfDay]: NewType });
  };

  const HandleScheduleStartTimeChange = (ScheduleId: number, NewStartTime: string) => {
    const NewSchedules = LocalSchedules.map((j) =>
      j.id === ScheduleId ? { ...j, startTime: NewStartTime } : j,
    );
    SetLocalSchedules(NewSchedules);
  };

  const HandleBlockChange = (
    ScheduleId: number,
    BlockId: number,
    Field: keyof Omit<Block, 'id' | 'start' | 'end'>,
      Value: string | number,
  ) => {
    const NewSchedules = LocalSchedules.map((j: Schedule) => {
      if (j.id === ScheduleId) {
            const NewBlocks = j.blocks.map((b: Block) =>
              b.id === BlockId
                ? {
                    ...b,
                    [Field]: Field === 'duration' ? Number(Value) : (Value as string | number),
                  }
                : b,
            );
        return { ...j, blocks: NewBlocks };
      }
      return j;
    });
    SetLocalSchedules(NewSchedules);
  };

  const HandleAliasChange = (ScheduleId: number, BlockId: number, Value: string) => {
    if (/^[a-zA-Z0-9]?$/.test(Value)) {
      HandleBlockChange(ScheduleId, BlockId, 'alias', Value);
    }
  };

  const HandleAddBlock = (ScheduleId: number) => {
    const NewSchedules = LocalSchedules.map((j) => {
      if (j.id === ScheduleId) {
        const NewBlockId =
          j.blocks.length > 0
            ? Math.max(...LocalSchedules.flatMap((x) => x.blocks).map((b) => b.id)) + 1
            : 1;
        const NewBlock: Block = {
          id: NewBlockId,
          alias: '',
          name: `New Block ${NewBlockId}`,
          duration: 10,
          start: '',
          end: '',
        };
        return { ...j, blocks: [...j.blocks, NewBlock] };
      }
      return j;
    });
    SetLocalSchedules(NewSchedules);
  };

  const HandleDeleteBlock = (ScheduleId: number, BlockId: number) => {
    const NewSchedules = LocalSchedules.map((j: Schedule) =>
      j.id === ScheduleId ? { ...j, blocks: j.blocks.filter((b) => b.id !== BlockId) } : j,
    );
    SetLocalSchedules(NewSchedules);
  };

  const HandlePasswordChange = () => {
    if (NewPassword !== ConfirmPassword) {
      SetPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    if (NewPassword.length < 4) {
      SetPasswordMessage({ type: 'error', text: 'Password must be at least 4 characters.' });
      return;
    }
    localStorage.setItem('timeac-password', NewPassword);
    SetPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
    SetNewPassword('');
    SetConfirmPassword('');
    setTimeout(() => SetPasswordMessage(null), 3000);
  };

  const HandleConfirmReset = () => {
    OnReset();
    SetShowResetConfirm(false);
  };

  const SelectedSchedule = LocalSchedules.find((j) => j.id === SelectedScheduleId);

  return (
    <div className={`config-view ${ClassName || ''}`}>
      <div className="config-content">
        <h2>Configuración</h2>

        <div className="config-section">
          <h3>Cambiar Contraseña</h3>
          <label htmlFor="new-password">Nueva Contraseña</label>
          <input
            type="password"
            id="new-password"
            value={NewPassword}
            onChange={(e) => SetNewPassword(e.target.value)}
          />
          <label htmlFor="confirm-password">Confirmar Contraseña</label>
          <input
            type="password"
            id="confirm-password"
            value={ConfirmPassword}
            onChange={(e) => SetConfirmPassword(e.target.value)}
          />
          <button onClick={HandlePasswordChange}>Cambiar Contraseña</button>
          {PasswordMessage && (
            <p className={PasswordMessage.type === 'error' ? 'error-message' : 'success-message'}>
              {PasswordMessage.text}
            </p>
          )}
        </div>

        <div className="config-section">
          <h3>Activar Jornada Especial</h3>
          <div className="config-controls">
            <span>
              Mañana: <strong>{LocalSettings.Morning.toUpperCase()}</strong>
            </span>
            <button onClick={() => HandleScheduleTypeToggle('Morning')}>
              Cambiar a {LocalSettings.Morning === 'Normal' ? 'Especial' : 'Normal'}
            </button>
          </div>
          <div className="config-controls">
            <span>
              Tarde: <strong>{LocalSettings.Afternoon.toUpperCase()}</strong>
            </span>
            <button onClick={() => HandleScheduleTypeToggle('Afternoon')}>
              Cambiar a {LocalSettings.Afternoon === 'Normal' ? 'Especial' : 'Normal'}
            </button>
          </div>
        </div>

        <div className="config-section">
          <h3>Editor de Bloques</h3>
          <label htmlFor="schedule-select">Seleccionar Jornada a Editar:</label>
          <select
            id="schedule-select"
            value={SelectedScheduleId}
            onChange={(e) => SetSelectedScheduleId(Number(e.target.value))}
          >
            {LocalSchedules.map((j) => (
              <option key={j.id} value={j.id}>
                {j.description}
              </option>
            ))}
          </select>

          {SelectedSchedule && (
            <div>
              <label>Hora de Inicio de la Jornada:</label>
              <input
                type="time"
                value={SelectedSchedule.startTime}
                onChange={(e) => HandleScheduleStartTimeChange(SelectedSchedule.id, e.target.value)}
              />
              <button
                onClick={() => HandleAddBlock(SelectedSchedule.id)}
                className="add-block-button"
              >
                Añadir Bloque a {SelectedSchedule.description}
              </button>
              <div className="block-editor-container">
                {SelectedSchedule.blocks.map((Block) => (
                  <div key={Block.id} className="block-editor">
                    <input
                      type="text"
                      value={String(Block.alias)}
                      onChange={(e) =>
                        HandleAliasChange(SelectedSchedule.id, Block.id, e.target.value)
                      }
                      maxLength={1}
                    />
                    <input
                      type="text"
                      value={Block.name}
                      onChange={(e) =>
                        HandleBlockChange(SelectedSchedule.id, Block.id, 'name', e.target.value)
                      }
                    />
                    <input
                      type="number"
                      value={Block.duration}
                      onChange={(e) =>
                        HandleBlockChange(SelectedSchedule.id, Block.id, 'duration', e.target.value)
                      }
                    />
                    <button
                      onClick={() => HandleDeleteBlock(SelectedSchedule.id, Block.id)}
                      className="danger-button icon-button"
                    >
                      <i className="bx bx-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="config-section">
          <h3>Zona de Peligro</h3>
          <p>Restablece todos los horarios y ajustes a sus valores originales.</p>
          <button onClick={() => SetShowResetConfirm(true)} className="danger-button">
            Restablecer Ajustes
          </button>
        </div>

        <div className="config-footer">
          <button onClick={OnCloseWithoutSaving} className="close-button">
            Cerrar sin guardar
          </button>
          <button
            onClick={() => OnSaveAndClose(LocalSchedules, LocalSettings)}
            className="save-button"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>

      {ShowResetConfirm && (
        <div className="config-view show">
          <div className="config-content">
            <h2>Confirmar Restablecimiento</h2>
            <p>
              ¿Estás seguro de que quieres restablecer todas las configuraciones a sus valores por
              defecto? Esta acción no se puede deshacer.
            </p>
            <div className="config-footer">
              <button onClick={() => SetShowResetConfirm(false)} className="close-button">
                Cancelar
              </button>
              <button onClick={HandleConfirmReset} className="danger-button">
                Sí, restablecer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
