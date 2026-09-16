export interface BarcodeReader {
  isAvailable(): boolean;
  scanJanCode(): Promise<string | null>;
}

/** 画面はこの境界だけを参照し、公式Barcode Scanner導入時に実装を差し替える。 */
export const barcodeReader: BarcodeReader = {
  isAvailable: () => false,
  scanJanCode: async () => null
};
