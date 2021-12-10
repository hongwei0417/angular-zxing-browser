import { NativeImgProcessService } from './native-img-process.service';
import { OpencvService } from './opencv.service';
import { ElementRef, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ControlValue, ImageProcessHtmlObj } from './DataObject';

@Injectable({
  providedIn: 'root',
})
export class ProcessControlService {
  enableGrayscale$ = new BehaviorSubject<boolean>(true);
  enableEqualization$ = new BehaviorSubject<boolean>(false);
  enableInvertColor$ = new BehaviorSubject<boolean>(true);
  enableThreshold$ = new BehaviorSubject<boolean>(true);
  enableBlur$ = new BehaviorSubject<boolean>(false);
  blurValue$ = new BehaviorSubject<number>(10);
  thresHoldValue$ = new BehaviorSubject<number>(0);

  nativeImageFilter$ = new BehaviorSubject<any>({});
  matchOneTemplate$ = new BehaviorSubject<any>({});
  contours$ = new BehaviorSubject<any>({});

  constructor(
    private opencvService: OpencvService,
    private nativeImgProcessService: NativeImgProcessService
  ) {}

  get controlValues(): ControlValue {
    return {
      enableGrayscale: this.enableBlur$.getValue(),
      enableEqualization: this.enableEqualization$.getValue(),
      enableInvertColor: this.enableInvertColor$.getValue(),
      enableThreshold: this.enableThreshold$.getValue(),
      enableBlur: this.enableGrayscale$.getValue(),
      blurValue: this.blurValue$.getValue(),
      thresHoldValue: this.thresHoldValue$.getValue(),
    };
  }

  nativeImageFilter(canvas: ElementRef<HTMLCanvasElement>) {
    this.nativeImgProcessService.imageFilter(canvas, this.controlValues);
  }

  matchOneTemplate(
    original: ElementRef<HTMLCanvasElement>,
    filtered: ElementRef<HTMLCanvasElement>,
    barcode: ElementRef<HTMLCanvasElement>,
    template: ElementRef<HTMLImageElement>
  ) {
    const htmlObj: ImageProcessHtmlObj = {
      original,
      filtered,
      barcode,
      template,
    };
    this.opencvService.matchOneTemplate(htmlObj, this.controlValues);
  }

  contours(
    original: ElementRef<HTMLCanvasElement>,
    filtered: ElementRef<HTMLCanvasElement>,
    barcode: ElementRef<HTMLCanvasElement>
  ) {
    const htmlObj: ImageProcessHtmlObj = {
      original,
      filtered,
      barcode,
    };
    this.opencvService.contours(htmlObj, this.controlValues);
  }
}
