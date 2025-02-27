/**
 * Vypočítá průměrnou hodnotu z pole čísel
 * @param values Pole číselných hodnot
 * @returns Průměrná hodnota
 */
export const calculateAverage = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  };
  
  /**
   * Vypočítá celkovou hodnotu z pole čísel
   * @param values Pole číselných hodnot
   * @returns Celková hodnota
   */
  export const calculateTotal = (values: number[]): number => {
    return values.reduce((acc, val) => acc + val, 0);
  };
  
  /**
   * Vypočítá zisk z příjmů a výdajů
   * @param income Příjmy
   * @param expenses Výdaje
   * @returns Zisk
   */
  export const calculateProfit = (income: number, expenses: number): number => {
    return income - expenses;
  };
  
  /**
   * Vypočítá procentuální rozdíl mezi dvěma hodnotami
   * @param current Aktuální hodnota
   * @param previous Předchozí hodnota
   * @returns Procentuální změna
   */
  export const calculatePercentChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };