export const dateUtils = {
  // Получить локальную дату из UTC (для отображения)
  fromUTC: (utcDateStr: string | undefined, utcTimeStr: string | undefined): { date: string, time: string } => {
    if (!utcDateStr || !utcTimeStr) {
      return { date: '', time: '' };
    }
    
    const dateParts = (utcDateStr as string).split('-');
    const timeParts = (utcTimeStr as string).split(':');
    
    if (dateParts.length !== 3 || timeParts.length !== 2) {
      return { date: utcDateStr as string, time: utcTimeStr as string };
    }
    
    const year = parseInt(dateParts[0] as string, 10);
    const month = parseInt(dateParts[1] as string, 10);
    const day = parseInt(dateParts[2] as string, 10);
    const hours = parseInt(timeParts[0] as string, 10);
    const minutes = parseInt(timeParts[1] as string, 10);
    
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    
    return {
      date: `${utcDate.getFullYear()}-${String(utcDate.getMonth() + 1).padStart(2, '0')}-${String(utcDate.getDate()).padStart(2, '0')}`,
      time: `${String(utcDate.getHours()).padStart(2, '0')}:${String(utcDate.getMinutes()).padStart(2, '0')}`
    };
  },

  // Получить UTC из локальной даты (для отправки)
  toUTC: (localDateStr: string | undefined, localTimeStr: string | undefined): { date: string, time: string } => {
    if (!localDateStr || !localTimeStr) {
      return { date: '', time: '' };
    }
    
    const dateParts = (localDateStr as string).split('-');
    const timeParts = (localTimeStr as string).split(':');
    
    if (dateParts.length !== 3 || timeParts.length !== 2) {
      return { date: localDateStr as string, time: localTimeStr as string };
    }
    
    const year = parseInt(dateParts[0] as string, 10);
    const month = parseInt(dateParts[1] as string, 10);
    const day = parseInt(dateParts[2] as string, 10);
    const hours = parseInt(timeParts[0] as string, 10);
    const minutes = parseInt(timeParts[1] as string, 10);
    
    const localDate = new Date(year, month - 1, day, hours, minutes);
    
    return {
      date: `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, '0')}-${String(localDate.getUTCDate()).padStart(2, '0')}`,
      time: `${String(localDate.getUTCHours()).padStart(2, '0')}:${String(localDate.getUTCMinutes()).padStart(2, '0')}`
    };
  },

  // Форматировать дату для отображения (ДД.ММ.ГГГГ)
  formatDisplay: (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const parts = (dateStr as string).split('-');
    if (parts.length !== 3) return dateStr as string;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  },

  // Получить текущую дату в UTC строке
  getTodayUTC: (): string => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  },

  // Получить текущее время в UTC строке
  getNowUTC: (): string => {
    const now = new Date();
    return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  }
};