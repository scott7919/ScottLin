
export interface ExtractedData {
  [key: string]: string | number | null;
}

export enum ProcessStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  status: ProcessStatus;
  data?: ExtractedData[]; // Changed to Array to support multiple items per image
  errorMessage?: string;
}

export interface ReferenceExample {
  id: string;
  previewUrl: string;
  data: ExtractedData[]; // Changed to Array
  base64: string; // Cache base64 to avoid re-reading
}

export interface ExtractionConfig {
  fields: string[];
  customPrompt: string;
}

export type Language = 'zh-TW' | 'en' | 'ja' | 'vi';
