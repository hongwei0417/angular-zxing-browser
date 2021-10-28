import { DeviceType } from './../deviceType';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  Result,
  ResultPoint,
} from '@zxing/library';
import { BehaviorSubject, fromEvent, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime } from 'rxjs/operators';
import { AppInfoDialogComponent } from '../app-info-dialog/app-info-dialog.component';
import { getDeviceType } from '../deviceType';
import { FormatsDialogComponent } from '../formats-dialog/formats-dialog.component';

@Component({
  selector: 'app-zxing-browser',
  templateUrl: './zxing-browser.component.html',
  styleUrls: ['./zxing-browser.component.scss'],
})
export class ZxingBrowserComponent implements OnInit, AfterViewInit {
  @ViewChild('video') video: ElementRef<HTMLVideoElement>;
  @ViewChild('mainPointers') mainPointers: ElementRef<HTMLCanvasElement>;
  @ViewChild('snapshotCanvas') snapshotCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('snapshotPointers')
  snapshotPointers: ElementRef<HTMLCanvasElement>;
  @ViewChild('scannerContainer') scannerContainer: ElementRef<HTMLDivElement>;
  @ViewChild('scannerArea') scannerArea: ElementRef<HTMLDivElement>;
  @ViewChild('snapshotContainer') snapshotContainer: ElementRef<HTMLDivElement>;

  private _hints: Map<DecodeHintType, any> | null = new Map<
    DecodeHintType,
    any
  >();

  currentDevice$ = new BehaviorSubject<MediaDeviceInfo>(null);
  availableDevices$ = new BehaviorSubject<MediaDeviceInfo[]>([]);
  resultPoints$ = new BehaviorSubject<ResultPoint[]>([]);
  videoLoaded$: Observable<Event>;
  videoResized$: Observable<any>;
  windowResized$: Observable<Event>;
  userMedia$ = new Subject();
  codeReader: BrowserMultiFormatReader;

  availableScanMode = [
    { name: 'auto', width: '85.5%', height: '47.5%' },
    { name: '1D', width: '85.5%', height: '20%' },
    { name: '2D', width: '50%', height: '50%' },
  ];
  currentScanMode = this.availableScanMode[0];
  formatsEnabled: BarcodeFormat[] = [
    BarcodeFormat.CODE_128,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.EAN_13,
    BarcodeFormat.QR_CODE,
  ];

  stream = null;
  hasDevices: boolean;
  hasPermission: boolean;
  constrains: any;
  result: any;
  message: any;
  error: any;
  frameCount = 0;
  scanPeriod = 60;

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

  get cropData() {
    const { width, height, offsetWidth, offsetHeight } =
      this.mainPointers.nativeElement;
    const widthRatio = offsetWidth / width;
    const heightRatio = offsetHeight / height;
    const cropWidth = this.scannerArea.nativeElement.offsetWidth / widthRatio;
    const cropHeight =
      this.scannerArea.nativeElement.offsetHeight / heightRatio;
    const x0 = width / 2 - cropWidth / 2;
    const y0 = height / 2 - cropHeight / 2;
    return {
      x0,
      y0,
      cropWidth,
      cropHeight,
    };
  }

  get videoResolution() {
    // const deviceType = getDeviceType();
    // if (deviceType === DeviceType.TABLET || deviceType === DeviceType.MOBILE) {
    //   return {
    //     width: 720,
    //     height: 1280,
    //   };
    // }
    return {
      width: { min: 1024, ideal: 1280, max: 1920 },
      height: { min: 576, ideal: 720, max: 1920 },
    };
  }

  constructor(private readonly _dialog: MatDialog) {}

  ngOnInit(): void {
    this.constrains = { audio: false, video: true };
    this.currentDevice$.subscribe(this.changeDevice.bind(this));
    this.userMedia$.subscribe(this.loadStream.bind(this));
    this.resultPoints$.subscribe(this.drawResult.bind(this));
  }

  ngAfterViewInit(): void {
    this.videoLoaded$ = fromEvent(this.video.nativeElement, 'loadedmetadata');
    this.videoResized$ = fromEvent(this.video.nativeElement, 'resize');
    this.windowResized$ = fromEvent(window, 'resize');
    this.initVideo();
    this.initAnalyzer();
  }

  initVideo() {
    this.videoLoaded$.subscribe(this.loadCanvas.bind(this));
    this.windowResized$.subscribe(this.resizeWindow.bind(this));
    this.videoResized$.subscribe(this.resizeWindow.bind(this));
    this.userMedia$.next();
  }

  initAnalyzer() {
    this.formats = this.formatsEnabled;
    this.codeReader = new BrowserMultiFormatReader(this.hints);
  }

  async loadDevices() {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (x) => x.kind === 'videoinput'
    );
    if (devices.length > 0) {
      this.hasDevices = true;
    }
    this.availableDevices$.next(devices);
  }

  async loadStream() {
    try {
      this.stop();
      const stream = await navigator.mediaDevices.getUserMedia(this.constrains);
      this.hasPermission = true;

      if (this.currentDevice$.getValue()) {
        this.video.nativeElement.srcObject = stream;
        this.video.nativeElement.play();
        this.stream = stream;
      }
      await this.loadDevices();
    } catch (error) {
      this.error = error;
      console.log(error);
    }
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
    this.resizeVideo();
    this.resizeSnapShot();
  }

  resizeVideo() {
    const { videoWidth, videoHeight } = this.video.nativeElement;
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

    this.mainPointers.nativeElement.width = videoWidth;
    this.mainPointers.nativeElement.height = videoHeight;
    this.scannerContainer.nativeElement.style.maxWidth = `${maxWidth}px`;
    this.scannerContainer.nativeElement.style.maxHeight = `${maxHeight}px`;
  }

  resizeSnapShot() {
    const { cropWidth, cropHeight } = this.cropData;
    const SNAPSHOT_RATIO = 0.3;
    const snapshotCanvas = this.snapshotCanvas.nativeElement;
    const snapshotPointers = this.snapshotPointers.nativeElement;
    const snapshotContainer = this.snapshotContainer.nativeElement;
    snapshotCanvas.width = cropWidth;
    snapshotCanvas.height = cropHeight;
    snapshotPointers.width = cropWidth;
    snapshotPointers.height = cropHeight;
    snapshotContainer.style.width = `${
      this.scannerArea.nativeElement.offsetWidth * SNAPSHOT_RATIO
    }px`;
    snapshotContainer.style.height = `${
      this.scannerArea.nativeElement.offsetHeight * SNAPSHOT_RATIO
    }px`;
  }

  onDeviceSelectChange(selected: string) {
    const device = this.availableDevices$
      .getValue()
      .find((x) => x.deviceId === selected);
    this.currentDevice$.next(device);
  }

  onScanModeSelectChange(selected: string) {
    const mode = this.availableScanMode.find((x) => x.name === selected);
    this.scannerArea.nativeElement.style.width = mode.width;
    this.scannerArea.nativeElement.style.height = mode.height;
    this.resizeWindow();
  }

  stop() {
    if (!this.stream) return;
    this.stream.getTracks().forEach((track) => {
      track.stop();
    });
    this.stream = null;
    this.video.nativeElement.srcObject = null;
  }

  changeDevice(device: MediaDeviceInfo) {
    if (!device) {
      this.stop();
      return;
    }
    const constrains = {
      audio: false,
      video: {
        deviceId: {
          exact: device.deviceId,
        },
        width: this.videoResolution.width,
        height: this.videoResolution.height,
      },
    };
    this.constrains = constrains;
    this.userMedia$.next();
  }

  openFormatsDialog() {
    const data = {
      formatsEnabled: this.formatsEnabled,
    };

    this._dialog
      .open(FormatsDialogComponent, { data })
      .afterClosed()
      .subscribe((x) => {
        if (x) {
          console.log(x);
          this.formatsEnabled = x;
          this.formats = this.formatsEnabled;
        }
      });
  }

  openInfoDialog() {
    const data = {
      hasDevices: this.hasDevices,
      hasPermission: this.hasPermission,
    };

    this._dialog.open(AppInfoDialogComponent, { data });
  }

  clearResult(): void {
    this.result = null;
  }

  clearMessage(): void {
    this.message = null;
  }

  clearError(): void {
    this.error = null;
  }

  test = 0;

  draw() {
    if (this.video.nativeElement.paused || this.video.nativeElement.ended)
      return;

    requestAnimationFrame(this.draw.bind(this));

    this.message = ++this.test;
    this.captureImage();

    if (++this.frameCount === this.scanPeriod) {
      this.frameCount = 0;
    } else {
      return;
    }

    this.decodeImage();
  }

  captureImage() {
    const { x0, y0, cropWidth, cropHeight } = this.cropData;
    const snapShotCtx = this.snapshotCanvas.nativeElement.getContext('2d');
    snapShotCtx.drawImage(
      this.video.nativeElement,
      x0,
      y0,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );
  }

  decodeImage() {
    try {
      const result = this.codeReader.decodeFromCanvas(
        this.snapshotCanvas.nativeElement
      );
      this.result = result.getText();
      this.resultPoints$.next(result.getResultPoints());
      console.log(result);
    } catch (error) {
      console.log('Not Found Result');
      this.clearPoints();
    }
  }

  drawResult(resultPoints: ResultPoint[]): void {
    if (resultPoints.length === 0) return;

    const mainResult = this.mainPointers.nativeElement;
    const snapshotResult = this.snapshotPointers.nativeElement;
    const { x0, y0 } = this.cropData;

    this.drawPoints(
      mainResult,
      resultPoints.map((p) => {
        return { x: x0 + p.getX(), y: y0 + p.getY() };
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
    ctx.lineWidth = 2;
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
    const mainResult = this.mainPointers.nativeElement;
    const snapshotResult = this.snapshotPointers.nativeElement;

    const pointersCtx = mainResult.getContext('2d');
    const resultCtx = snapshotResult.getContext('2d');

    pointersCtx.clearRect(0, 0, mainResult.width, mainResult.height);
    resultCtx.clearRect(0, 0, snapshotResult.width, snapshotResult.height);
  }
}
