import { useState, useEffect } from 'react';

function GetCurrentTime() {
  const Now = new Date();
  const Hours = Now.getHours().toString().padStart(2, '0');
  const Minutes = Now.getMinutes().toString().padStart(2, '0');
  const Seconds = Now.getSeconds().toString().padStart(2, '0');
  return `${Hours}:${Minutes}:${Seconds}`;
}

export function Clock() {
  const [Time, SetTime] = useState(GetCurrentTime());

  useEffect(() => {
    const TimerId = setInterval(() => {
      SetTime(GetCurrentTime());
    }, 1000);
    return () => clearInterval(TimerId);
  }, []);

  return (
    <div key={Time} className="clock">
      {Time}
    </div>
  );
}
