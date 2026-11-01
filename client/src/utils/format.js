const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export const formatCurrency = (n) => currency.format(n || 0);
export const currentMonth = () => new Date().toISOString().slice(0, 7);
export const today = () => new Date().toISOString().slice(0, 10);
