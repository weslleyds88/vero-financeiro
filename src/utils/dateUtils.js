import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatDate = (date, formatString = 'dd/MM/yyyy') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString, { locale: ptBR });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: ptBR });
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount || 0);
};

export const getCurrentMonth = () => {
  return format(new Date(), 'yyyy-MM');
};

export const getCurrentMonthObj = () => {
  const now = new Date();
  return {
    month: now.getMonth(), // 0-11
    year: now.getFullYear()
  };
};

export const getMonthName = (date) => {
  const dateObj = typeof date === 'string' ? parseISO(date + '-01') : date;
  return format(dateObj, 'MMMM yyyy', { locale: ptBR });
};

export const formatMonthName = (monthObj) => {
  if (typeof monthObj === 'string') {
    return getMonthName(monthObj);
  }
  
  if (typeof monthObj === 'object' && monthObj.month !== undefined) {
    const date = new Date(monthObj.year, monthObj.month, 1);
    return format(date, 'MMMM yyyy', { locale: ptBR });
  }
  
  return '';
};

export const getMonthDays = (year, month) => {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  return eachDayOfInterval({ start, end });
};

export const isDateToday = (date) => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isToday(dateObj);
};

export const isSameMonthAsDate = (date1, date2) => {
  if (!date1 || !date2) return false;
  const dateObj1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const dateObj2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return isSameMonth(dateObj1, dateObj2);
};

export const getNextMonth = (currentMonth) => {
  // Se for string (yyyy-MM)
  if (typeof currentMonth === 'string') {
    const date = parseISO(currentMonth + '-01');
    return format(addMonths(date, 1), 'yyyy-MM');
  }
  
  // Se for objeto {month, year}
  if (typeof currentMonth === 'object' && currentMonth.month !== undefined) {
    const date = new Date(currentMonth.year, currentMonth.month, 1);
    const nextDate = addMonths(date, 1);
    return {
      month: nextDate.getMonth(),
      year: nextDate.getFullYear()
    };
  }
  
  return currentMonth;
};

export const getPreviousMonth = (currentMonth) => {
  // Se for string (yyyy-MM)
  if (typeof currentMonth === 'string') {
    const date = parseISO(currentMonth + '-01');
    return format(subMonths(date, 1), 'yyyy-MM');
  }
  
  // Se for objeto {month, year}
  if (typeof currentMonth === 'object' && currentMonth.month !== undefined) {
    const date = new Date(currentMonth.year, currentMonth.month, 1);
    const prevDate = subMonths(date, 1);
    return {
      month: prevDate.getMonth(),
      year: prevDate.getFullYear()
    };
  }
  
  return currentMonth;
};

export const parseDate = (dateString) => {
  if (!dateString) return null;
  return parseISO(dateString);
};

export const toISOString = (date) => {
  if (!date) return null;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj.toISOString();
};

export const toDateString = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
};

export const getMonthRange = (monthString) => {
  const [year, month] = monthString.split('-').map(Number);
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  return { start, end };
};
