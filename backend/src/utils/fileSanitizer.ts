import path from 'path';

export class FileSanitizer {
  public static sanitizeFileName(fileName: string): string {
    // Remove null bytes, path traversal sequences
    const base = path.basename(fileName).replace(/\0/g, '');
    // Replace any unsafe characters while preserving alphanumeric, periods, dashes, underscores
    const safeName = base.replace(/[^a-zA-Z0-9._\- ]/g, '_').trim();
    return safeName || `file_${Date.now()}`;
  }

  public static isAllowedExtension(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    const allowed = ['.xlsx', '.xls', '.csv', '.txt', '.zip'];
    return allowed.includes(ext);
  }

  public static getFileExtension(fileName: string): string {
    return path.extname(fileName).toLowerCase().replace('.', '');
  }
}
