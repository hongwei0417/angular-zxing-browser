import { ElementRef } from '@angular/core';

export interface ImageProcessHtmlObj {
  original: ElementRef<HTMLCanvasElement>;
  filtered: ElementRef<HTMLCanvasElement>;
  barcode: ElementRef<HTMLCanvasElement>;
  template?: ElementRef<HTMLImageElement>;
}

export interface ControlValue {
  enableGrayscale?: boolean;
  enableEqualization?: boolean;
  enableInvertColor?: boolean;
  enableThreshold?: boolean;
  enableBlur?: boolean;
  blurValue?: number;
  thresHoldValue?: number;
}
