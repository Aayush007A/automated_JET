export class DataNormalizer {
  public static parseNumber(value: any, decimalSeparator: 'Period' | 'Comma' | 'None' = 'Period'): number {
    if (value === null || value === undefined) return 0.0;
    if (typeof value === 'number') return isNaN(value) ? 0.0 : value;

    let str = value.toString().trim();
    if (str === '' || str === '-' || str.toLowerCase() === 'na' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') {
      return 0.0;
    }

    let isNegative = false;
    // Check for parentheses negatives: (6,45,04,072) or (100.50)
    if (str.startsWith('(') && str.endsWith(')')) {
      isNegative = true;
      str = str.substring(1, str.length - 1).trim();
    } else if (str.startsWith('-') || str.endsWith('-')) {
      isNegative = true;
      str = str.replace(/-/g, '').trim();
    }

    // Strip currency symbols ($, Rs, ₹, €, £, INR, USD, etc.)
    str = str.replace(/[^0-9.,]/g, '');

    if (decimalSeparator === 'Comma') {
      // European format: 1.234.567,89 -> 1234567.89
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Standard / Indian format: 1,09,52,612.50 -> 10952612.50
      str = str.replace(/,/g, '');
    }

    const num = parseFloat(str);
    if (isNaN(num)) return 0.0;
    return isNegative ? -num : num;
  }

  public static parseDateToISO(value: any): string {
    if (!value) return '';
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return '';
      return value.toISOString().split('T')[0];
    }

    const str = value.toString().trim();
    if (!str || str === '-' || str.toLowerCase() === 'na' || str.toLowerCase() === 'n/a') return '';

    // Handle Excel serial date numbers (e.g. 45292)
    if (/^\d{5}$/.test(str)) {
      const serial = parseInt(str, 10);
      const utcDays = serial - 25569;
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      return dateInfo.toISOString().split('T')[0];
    }

    // Match YYYYMMDD (e.g., 20251103)
    if (/^\d{8}$/.test(str)) {
      const yyyy = str.substring(0, 4);
      const mm = str.substring(4, 6);
      const dd = str.substring(6, 8);
      return `${yyyy}-${mm}-${dd}`;
    }

    // Match DD-MMM-YY or DD-MMM-YYYY (e.g., 03-Nov-25 or 31-Dec-2025 or 31-Mar-25)
    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    const dmmmyRegex = /^(\d{1,2})[-\/\s]([A-Za-z]{3})[-\/\s](\d{2,4})$/;
    const dmmmyMatch = str.match(dmmmyRegex);
    if (dmmmyMatch) {
      const dd = dmmmyMatch[1].padStart(2, '0');
      const monStr = dmmmyMatch[2].toLowerCase();
      let yyyy = dmmmyMatch[3];
      if (yyyy.length === 2) {
        yyyy = parseInt(yyyy, 10) > 70 ? `19${yyyy}` : `20${yyyy}`;
      }
      const mm = monthNames[monStr] || '01';
      return `${yyyy}-${mm}-${dd}`;
    }

    // Match standard MM/DD/YYYY or DD/MM/YYYY or YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }

    const slashMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
    if (slashMatch) {
      let yyyy = slashMatch[3];
      if (yyyy.length === 2) {
        yyyy = parseInt(yyyy, 10) > 70 ? `19${yyyy}` : `20${yyyy}`;
      }
      // Ambiguous DD/MM vs MM/DD: if first > 12, it's DD/MM
      const first = parseInt(slashMatch[1], 10);
      const second = parseInt(slashMatch[2], 10);
      if (first > 12) {
        return `${yyyy}-${second.toString().padStart(2, '0')}-${first.toString().padStart(2, '0')}`;
      } else {
        return `${yyyy}-${first.toString().padStart(2, '0')}-${second.toString().padStart(2, '0')}`;
      }
    }

    // Fallback: try JS Date
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {
      // ignore
    }

    return str;
  }

  public static formatDateToDeloitte(isoDateStr: string): string {
    if (!isoDateStr) return '';
    const parts = isoDateStr.split('-');
    if (parts.length !== 3) return isoDateStr;

    const yyyy = parts[0];
    const mm = parseInt(parts[1], 10);
    const dd = parts[2].padStart(2, '0');

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[mm - 1] || 'Jan';
    const yy = yyyy.slice(-2);

    return `${dd}-${month}-${yy}`;
  }

  public static cleanText(text: any): string {
    if (text === null || text === undefined) return '';
    return text.toString().replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  public static cleanAccountNumber(accountNumber: any): string {
    if (accountNumber === null || accountNumber === undefined) return '';
    let str = accountNumber.toString().trim();
    // Remove formatting prefixes if needed, but preserve leading zeros if standard code
    return str;
  }
}
