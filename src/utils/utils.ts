export function formatTime(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
  
    const formatNumber = (num: number) => String(num).padStart(2, '0');
  
    return `${formatNumber(hrs)}:${formatNumber(mins)}:${formatNumber(secs)}`;
  }
  