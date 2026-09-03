/**
 * Ambient type declarations for the `qrcode` core encoder.
 *
 * We deep-import `qrcode/lib/core/qrcode` (the pure-ES module behind
 * `react-native-qrcode-svg`) instead of the package root: the package entry
 * pulls in Node-only `fs`/`canvas` renderers that Metro cannot bundle, while
 * the core module only requires sibling modules and runs on-device / offline.
 * The package ships no types, so the minimal surface we use is declared here.
 */
declare module 'qrcode/lib/core/qrcode' {
  /** Dense module matrix produced by the encoder. */
  export interface QrModules {
    /** Square dimension (modules per side). */
    size: number;
    /** Row-major `0|1` cells — `data[row * size + col]`. */
    data: Uint8Array;
    get(row: number, col: number): number;
    isReserved(row: number, col: number): boolean;
  }

  export interface QrCodeResult {
    modules: QrModules;
    version: number;
    errorCorrectionLevel: { bit: number } | number | string;
    maskPattern: number;
  }

  export interface QrOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    version?: number;
    maskPattern?: number;
  }

  export function create(data: string, options?: QrOptions): QrCodeResult;

  const qrcodeCore: {
    create: typeof create;
  };
  export default qrcodeCore;
}