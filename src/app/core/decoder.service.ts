import { ScannerService } from './scanner.service';
import { ElementRef, Injectable } from '@angular/core';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, ResultPoint } from '@zxing/library';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DecoderService {
  private _hints: Map<DecodeHintType, any> | null = new Map<
    DecodeHintType,
    any
  >();

  constructor() {
    this.codeReader = new BrowserMultiFormatReader();
  }

  result$ = new BehaviorSubject<string>('');
  resultPoints$ = new BehaviorSubject<ResultPoint[]>([]);
  codeReader: BrowserMultiFormatReader;

  get hints() {
    return this._hints;
  }
  set hints(hints: Map<DecodeHintType, any>) {
    this._hints = hints;
    this.codeReader?.setHints(this._hints);
  }

  get formats(): BarcodeFormat[] {
    return this.hints.get(DecodeHintType.POSSIBLE_FORMATS);
  }
  set formats(input: BarcodeFormat[]) {
    if (typeof input === 'string') {
      throw new Error(
        'Invalid formats, make sure the [formats] input is a binding.'
      );
    }

    const getBarcodeFormatOrFail = (
      format: string | BarcodeFormat
    ): BarcodeFormat => {
      return typeof format === 'string'
        ? BarcodeFormat[format.trim().toUpperCase()]
        : format;
    };

    const formats = input.map((f) => getBarcodeFormatOrFail(f));

    const hints = this.hints;

    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

    this.hints = hints;
  }

  decodeCanvas(decodedCanvas: ElementRef<HTMLCanvasElement>) {
    try {
      const result = this.codeReader.decodeFromCanvas(
        decodedCanvas.nativeElement
      );
      this.result$.next(result.getText());
      this.resultPoints$.next(result.getResultPoints());
      console.log(result);
    } catch (error) {
      console.log('Not Found Result');
      this.resultPoints$.next([]);
    }
  }
}
