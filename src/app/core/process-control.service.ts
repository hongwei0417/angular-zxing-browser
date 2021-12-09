import { NativeImgProcessService } from './native-img-process.service';
import { OpencvService } from './opencv.service';
import { ElementRef, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProcessControlService {
  constructor(
    private opencvService: OpencvService,
    private nativeImgProcessService: NativeImgProcessService
  ) {}

  nativeImageFilter(canvas: ElementRef<HTMLCanvasElement>) {
    this.nativeImgProcessService.imageFilter(canvas);
  }

  matchOneTemplate(
    original: ElementRef<HTMLCanvasElement>,
    filtered: ElementRef<HTMLCanvasElement>,
    barcode: ElementRef<HTMLCanvasElement>,
    template: ElementRef<HTMLImageElement>
  ) {
    this.opencvService.matchOneTemplate(original, filtered, barcode, template);
  }

  contours(
    original: ElementRef<HTMLCanvasElement>,
    filtered: ElementRef<HTMLCanvasElement>,
    barcode: ElementRef<HTMLCanvasElement>
  ) {
    this.opencvService.contours(original, filtered, barcode);
  }
}
