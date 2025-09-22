
import { useState, useEffect } from 'react';

function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

export function Clock() {
    const [time, setTime] = useState(getCurrentTime());

    useEffect(() => {
        const timerId = setInterval(() => {
            setTime(getCurrentTime());
        }, 1000);
        return () => clearInterval(timerId);
    }, []);

    return <div className="clock">{time}</div>;
}
