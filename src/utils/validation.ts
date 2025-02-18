
export function isValid(str: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(str);
}

export function isValidExtension(str: string): boolean {
  return /^[a-zA-Z0-9]{1,5}$/.test(str);
}

export function isWithinSizeLimit(str: string, limitKB: number = 10) {
  const blob = new Blob([str]);
  return blob.size <= limitKB * 1024;
}