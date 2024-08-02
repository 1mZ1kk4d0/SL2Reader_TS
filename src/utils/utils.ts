export function formatTime(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
  
    const formatNumber = (num: number) => String(num).padStart(2, '0');
  
    return `${formatNumber(hrs)}:${formatNumber(mins)}:${formatNumber(secs)}`;
  }

export function find(buffer: Uint8Array): number {
    for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] === 0x00 && buffer[i + 1] === 0x00) {
            return i;
        }
    }
    return -1; // Retorna -1 se a sequência não for encontrada
}

export interface Character {
  character_slot: number;
  character_name?: string;
  character_level?: number;
  character_time?: number;
  character_time_format?: string;
}
