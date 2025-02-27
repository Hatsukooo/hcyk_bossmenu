/**
 * Formátuje číslo jako měnovou hodnotu
 * @param value Číselná hodnota
 * @param currency Symbol měny (výchozí: $)
 * @returns Formátovaný řetězec
 */
export const formatCurrency = (value: number, currency: string = "$"): string => {
    return `${currency}${value.toLocaleString()}`;
  };
  
  /**
   * Formátuje procenta
   * @param value Číselná hodnota (0-100)
   * @returns Formátovaný řetězec
   */
  export const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };
  
  /**
   * Formátuje datum do čitelného formátu
   * @param date Datum
   * @returns Formátovaný řetězec
   */
  export const formatDate = (date: Date): string => {
    return date.toLocaleDateString('cs-CZ');
  };