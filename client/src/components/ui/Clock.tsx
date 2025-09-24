import { useState, useEffect } from "react";
import { Clock as ClockIcon } from "lucide-react";

export function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="flex items-center space-x-4 text-gray-600">
      <ClockIcon className="h-6 w-6 lg:h-8 lg:w-8 text-gray-700" />
      <div className="text-right">
        <div className="text-xl lg:text-3xl font-mono font-bold text-gray-900 tracking-wide">
          {formatTime(time)}
        </div>
        <div className="text-sm lg:text-base text-gray-500 hidden sm:block font-medium">
          {formatDate(time)}
        </div>
      </div>
    </div>
  );
}
