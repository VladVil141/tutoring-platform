export const dateUtils = {
  // Получить строку UTC из локальной даты
  toUTC: (dateStr: string, timeStr: string): { date: string, time: string } => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const localDate = new Date(year, month - 1, day, hours, minutes);
    const utcDate = new Date(localDate.getTime());
    
    return {
      date: `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}`,
      time: `${String(utcDate.getUTCHours()).padStart(2, '0')}:${String(utcDate.getUTCMinutes()).padStart(2, '0')}`
    };
  },

  // Получить локальную дату из UTC
  toLocal: (utcDateStr: string, utcTimeStr: string): { date: string, time: string } => {
    const [year, month, day] = utcDateStr.split('-').map(Number);
    const [hours, minutes] = utcTimeStr.split(':').map(Number);
    
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    
    return {
      date: `${utcDate.getFullYear()}-${String(utcDate.getMonth() + 1).padStart(2, '0')}-${String(utcDate.getDate()).padStart(2, '0')}`,
      time: `${String(utcDate.getHours()).padStart(2, '0')}:${String(utcDate.getMinutes()).padStart(2, '0')}`
    };
  },

  // Получить строку UTC из Date объекта
  getUTCString: (date: Date): string => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  },

  // Форматировать дату для отображения (ДД.ММ.ГГГГ)
  formatDisplay: (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  },

  // Получить день недели из строки
  getDayOfWeek: (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const days = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
    return days[date.getUTCDay()];
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