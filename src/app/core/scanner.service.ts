import { DecoderService } from './decoder.service';
import { CameraService } from './camera.service';
import { ElementRef, Injectable } from '@angular/core';
import { fromEvent, Observable } from 'rxjs';
import { BarcodeFormat, BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';

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

  error: any;
  zoomRatio = 1;
  frameCount = 0;
  scanPeriod = 30;

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
      this.scannerArea.nativeElement.offsetWidth / widthRatio / this.zoomRatio;
    const cropHeight =
      this.scannerArea.nativeElement.offsetHeight /
      heightRatio /
      this.zoomRatio;
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
    snapshotContainer: ElementRef<HTMLDivElement>
  ) {
    this.scannerArea = scannerArea;
    this.scanResultCanvas = scanResultCanvas;
    this.scannerContainer = scannerContainer;
    this.snapshotContainer = snapshotContainer;
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
    this.videoLoaded$.subscribe(this.loadCanvas.bind(this));
  }

  loadCanvas() {
    try {
      this.resizeWindow();
      this.draw();
    } catch (error) {
      this.error = error;
    }
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
    this.zoomRatio = 1;
    this.cameraService.camera.nativeElement.style.transform = `scale(1)`;
    this.scanResultCanvas.nativeElement.style.transform = `scale(1)`;
  }

  draw() {
    if (!this.cameraService.active) return;

    requestAnimationFrame(this.draw.bind(this));

    this.captureImage();

    if (++this.frameCount === this.scanPeriod) {
      this.frameCount = 0;
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
      cropWidth * this.zoomRatio,
      cropHeight * this.zoomRatio
    );
  }
}
