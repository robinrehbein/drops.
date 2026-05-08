// Shim for `expo-file-system/legacy` to avoid TS compiling the package's
// raw `.ts` source under our project's strict + exactOptionalPropertyTypes
// config. The legacy module's source has a strict-incompatible assignment
// in DownloadResumable; we expose only the surface we use.
declare module 'expo-file-system/legacy' {
  export const cacheDirectory: string | null;
  export const documentDirectory: string | null;
  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: { encoding?: 'utf8' | 'base64' },
  ): Promise<void>;
  export function readAsStringAsync(
    fileUri: string,
    options?: { encoding?: 'utf8' | 'base64' },
  ): Promise<string>;
  export function deleteAsync(
    fileUri: string,
    options?: { idempotent?: boolean },
  ): Promise<void>;
}
