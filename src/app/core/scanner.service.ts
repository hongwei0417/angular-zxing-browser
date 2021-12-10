import { DecoderService } from './decoder.service';
import { CameraService } from './camera.service';
import { ElementRef, Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, Observable } from 'rxjs';
import { BarcodeFormat, BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, ResultPoint } from '@zxing/library';

@Injectable({
  providedIn: 'root',
})
export class ScannerService {
  scannerArea: ElementRef<HTMLDivElement>;
  scannerContainer: ElementRef<HTMLDivElement>;
  scanResultCanvas: ElementRef<HTMLCanvasElement>;
  snapshotCanvas: ElementRef<HTMLCanvasElement>;
  snapshotContainer: ElementRef<HTMLDivElement>;
  snapshotScanResultCanvas: ElementRef<HTMLCanvasElement>;
  videoClick$: Observable<Event>;
  videoLoaded$: Observable<Event>;
  videoResized$: Observable<Event>;
  windowResized$: Observable<Event>;
  codeReader: BrowserMultiFormatReader;

  error$ = new BehaviorSubject<any>('');
  frameCount$ = new BehaviorSubject<number>(0);
  zoomRatio$ = new BehaviorSubject<number>(1);
  scanPeriod = 30;
  imageProcessCallback: Function;

  constructor(
    private cameraService: CameraService,
    private decoderService: DecoderService
  ) {}

  get cropData() {
    const { width, height, offsetWidth, offsetHeight } =
      this.scanResultCanvas.nativeElement;
    const widthRatio = offsetWidth / width;
    const heightRatio = offsetHeight / height;
    const cropWidth =
      this.scannerArea.nativeElement.offsetWidth /
      widthRatio /
      this.zoomRatio$.getValue();
    const cropHeight =
      this.scannerArea.nativeElement.offsetHeight /
      heightRatio /
      this.zoomRatio$.getValue();
    const x0 = width / 2 - cropWidth / 2;
    const y0 = height / 2 - cropHeight / 2;
    return {
      x0,
      y0,
      cropWidth,
      cropHeight,
    };
  }

  init(
    scannerArea: ElementRef<HTMLDivElement>,
    scannerContainer: ElementRef<HTMLDivElement>,
    scanResultCanvas: ElementRef<HTMLCanvasElement>,
    snapshotCanvas: ElementRef<HTMLCanvasElement>,
    snapshotContainer: ElementRef<HTMLDivElement>,
    snapshotScanResultCanvas: ElementRef<HTMLCanvasElement>
  ) {
    this.scannerArea = scannerArea;
    this.scannerContainer = scannerContainer;
    this.scanResultCanvas = scanResultCanvas;
    this.snapshotCanvas = snapshotCanvas;
    this.snapshotContainer = snapshotContainer;
    this.snapshotScanResultCanvas = snapshotScanResultCanvas;

    //events
    this.videoClick$ = fromEvent(this.scannerContainer.nativeElement, 'click');
    this.videoLoaded$ = fromEvent(
      this.cameraService.camera.nativeElement,
      'loadedmetadata'
    );
    this.videoResized$ = fromEvent(
      this.cameraService.camera.nativeElement,
      'resize'
    );
    this.windowResized$ = fromEvent(window, 'resize');

    // subscribes
    this.videoLoaded$.subscribe(this.start.bind(this));
    this.decoderService.resultPoints$.subscribe(this.drawResult.bind(this));
    this.zoomRatio$.subscribe(this.onZoomChange.bind(this));
    this.videoClick$.subscribe(this.cameraService.pauseAndPlay);
    this.windowResized$.subscribe(this.resizeWindow.bind(this));
    this.videoResized$.subscribe(this.resizeWindow.bind(this));
  }

  setImageProcessCallback(func: Function) {
    this.imageProcessCallback = func;
  }

  start() {
    try {
      this.resizeWindow();
      this.scan();
    } catch (error) {
      this.error$.next(error);
    }
  }

  onZoomChange(value): void {
    this.cameraService.camera.nativeElement.style.transform = `scale(${value})`;
    this.scanResultCanvas.nativeElement.style.transform = `scale(${value})`;
  }

  resizeWindow() {
    this.resetSetting();
    this.resizeVideo();
    this.resizeSnapShot();
  }

  resizeVideo() {
    const { videoWidth, videoHeight } = this.cameraService.camera.nativeElement;
    const { offsetWidth, offsetHeight } = document.body;
    const videoRatio = videoHeight / videoWidth;
    const currentRatio = offsetHeight / offsetWidth;
    let maxWidth, maxHeight;

    if (currentRatio > videoRatio) {
      maxWidth = offsetWidth;
      maxHeight = offsetWidth * videoRatio;
    } else {
      maxWidth = offsetHeight / videoRatio;
      maxHeight = offsetHeight;
    }

    this.scanResultCanvas.nativeElement.width = videoWidth;
    this.scanResultCanvas.nativeElement.height = videoHeight;
    this.scannerContainer.nativeElement.style.maxWidth = `${maxWidth}px`;
    this.scannerContainer.nativeElement.style.maxHeight = `${maxHeight}px`;
  }

  resizeSnapShot() {
    const { cropWidth, cropHeight } = this.cropData;
    const SNAPSHOT_RATIO = 0.3;
    const snapshotCanvas = this.snapshotCanvas.nativeElement;
    const snapshotScanResultCanvas =
      this.snapshotScanResultCanvas.nativeElement;
    const snapshotContainer = this.snapshotContainer.nativeElement;
    snapshotCanvas.width = cropWidth;
    snapshotCanvas.height = cropHeight;
    snapshotScanResultCanvas.width = cropWidth;
    snapshotScanResultCanvas.height = cropHeight;
    snapshotContainer.style.width = `${
      this.scannerArea.nativeElement.offsetWidth * SNAPSHOT_RATIO
    }px`;
    snapshotContainer.style.height = `${
      this.scannerArea.nativeElement.offsetHeight * SNAPSHOT_RATIO
    }px`;
  }

  resetSetting() {
    this.zoomRatio$.next(1);
  }

  scan() {
    if (!this.cameraService.active) return;
    requestAnimationFrame(this.scan.bind(this));

    this.captureImage();

    this.frameCount$.next(this.frameCount$.getValue() + 1);
    if (this.frameCount$.getValue() === this.scanPeriod) {
      this.frameCount$.next(0);
    } else {
      return;
    }

    this.decoderService.decodeCanvas(this.snapshotCanvas);
  }

  captureImage() {
    const { x0, y0, cropWidth, cropHeight } = this.cropData;
    const snapShotCtx = this.snapshotCanvas.nativeElement.getContext('2d');
    // const mask = this.dataMatrixTemplateImage.nativeElement;
    snapShotCtx.drawImage(
      this.cameraService.camera.nativeElement,
      x0,
      y0,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth * this.zoomRatio$.getValue(),
      cropHeight * this.zoomRatio$.getValue()
    );

    if (this.imageProcessCallback) {
      this.imageProcessCallback();
    }
  }

  drawResult(resultPoints: ResultPoint[]): void {
    if (resultPoints.length === 0) {
      this.clearPoints();
      return;
    }

    const scanResult = this.scanResultCanvas.nativeElement;
    const snapshotResult = this.snapshotScanResultCanvas.nativeElement;
    const { x0, y0 } = this.cropData;

    this.drawPoints(
      scanResult,
      resultPoints.map((p) => {
        return {
          x: x0 + p.getX() / this.zoomRatio$.getValue(),
          y: y0 + p.getY() / this.zoomRatio$.getValue(),
        };
      })
    );
    this.drawPoints(
      snapshotResult,
      resultPoints.map((p) => {
        return { x: p.getX(), y: p.getY() };
      })
    );
  }

  drawPoints(canvas: HTMLCanvasElement, points: any = []): void {
    // set canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'red';

    // draw points
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((p) => {
      ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  clearPoints(): void {
    const scanResult = this.scanResultCanvas.nativeElement;
    const snapshotResult = this.snapshotScanResultCanvas.nativeElement;

    const scanResultCtx = scanResult.getContext('2d');
    const snapshotResultCtx = snapshotResult.getContext('2d');

    scanResultCtx.clearRect(0, 0, scanResult.width, scanResult.height);
    snapshotResultCtx.clearRect(
      0,
      0,
      snapshotResult.width,
      snapshotResult.height
    );
  }
}
