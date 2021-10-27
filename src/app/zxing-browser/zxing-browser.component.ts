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
import { BehaviorSubject, fromEvent, Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
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
  @ViewChild('mainCanvas') mainCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('mainResult') mainResult: ElementRef<HTMLCanvasElement>;
  @ViewChild('snapshotCanvas') snapshotCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('snapshotResult') snapshotResult: ElementRef<HTMLCanvasElement>;
  @ViewChild('scannerContainer') scannerContainer: ElementRef<HTMLDivElement>;
  @ViewChild('scannerArea') scannerArea: ElementRef<HTMLDivElement>;
  @ViewChild('snapshotContainer') snapshotContainer: ElementRef<HTMLDivElement>;

  private _cropSetting = null;
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

  set cropSetting(data) {
    this._cropSetting = data;
  }
  cp = {};
  get cropSetting() {
    const { width, height, offsetWidth, offsetHeight } =
      this.mainResult.nativeElement;
    const widthRatio = offsetWidth / width;
    const heightRatio = offsetHeight / height;
    const cropWidth =
      this._cropSetting?.cropWidth ||
      this.scannerArea.nativeElement.offsetWidth / widthRatio;
    const cropHeight =
      this._cropSetting?.cropHeight ||
      this.scannerArea.nativeElement.offsetHeight / heightRatio;
    const color = this._cropSetting?.color || 'red';
    const dash = this._cropSetting?.dash || [5, 10];
    const lineWidth = this._cropSetting?.lineWidth || 3;
    const x0 = width / 2 - cropWidth / 2;
    const y0 = height / 2 - cropHeight / 2;
    this.cp = {
      x0,
      y0,
      cropWidth: cropWidth,
      cropHeight: cropHeight,
      originWidth: width,
      originHeight: height,
      originOffsetWidth: offsetWidth,
      originOffsetHeight: offsetHeight,
      color,
      dash,
      lineWidth,
    };
    return {
      x0,
      y0,
      width: cropWidth,
      height: cropHeight,
      color,
      dash,
      lineWidth,
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
      width: 1280,
      height: 720,
    };
  }

  constrains: any = {
    audio: false,
    video: true,
  };

  stream = null;

  formatsEnabled: BarcodeFormat[] = [
    BarcodeFormat.CODE_128,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.EAN_13,
    BarcodeFormat.QR_CODE,
  ];

  hasDevices: boolean;
  hasPermission: boolean;

  result: string;
  message: any = '';
  frameCount = 0;
  scanPeriod = 60;

  constructor(private readonly _dialog: MatDialog) {}

  ngOnInit(): void {
    this.currentDevice$.subscribe(this.changeDevice.bind(this));
    this.userMedia$.subscribe(this.loadStream.bind(this));
    this.resultPoints$.subscribe(this.drawResult.bind(this));
    window.addEventListener('orientationchange', (e: any) => {
      console.log(e);
    });
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
      this.message = this.constrains;
      const stream = await navigator.mediaDevices.getUserMedia(this.constrains);
      this.hasPermission = true;

      if (this.currentDevice$.getValue()) {
        this.video.nativeElement.srcObject = stream;
        this.video.nativeElement.play();
        this.stream = stream;
      }

      await this.loadDevices();
    } catch (error) {
      this.message = error;
      console.log(error);
    }
  }

  loadCanvas() {
    this.resizeWindow();
    this.draw();
  }

  resizeTimes = 0;

  resizeWindow() {
    this.resizeVideo();
    this.resizeSnapShot();
  }

  resizeVideo() {
    try {
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

      this.mainCanvas.nativeElement.width = videoWidth;
      this.mainCanvas.nativeElement.height = videoHeight;
      this.mainResult.nativeElement.width = videoWidth;
      this.mainResult.nativeElement.height = videoHeight;
      this.scannerContainer.nativeElement.style.maxWidth = `${maxWidth}px`;
      this.scannerContainer.nativeElement.style.maxHeight = `${maxHeight}px`;
      this.resizeTimes++;
      // this.result = `${videoWidth},${videoHeight},${videoRatio}, ${currentRatio}`;
    } catch (error) {
      this.result = error;
    }
  }

  resizeSnapShot() {
    const { width, height } = this.cropSetting;
    const snapshotCanvas = this.snapshotCanvas.nativeElement;
    const snapshotResult = this.snapshotResult.nativeElement;
    const snapshotContainer = this.snapshotContainer.nativeElement;
    snapshotCanvas.width = width;
    snapshotCanvas.height = height;
    snapshotResult.width = width;
    snapshotResult.height = height;
    snapshotContainer.style.width = `${
      this.scannerArea.nativeElement.offsetWidth * 0.3
    }px`;
    snapshotContainer.style.height = `${
      this.scannerArea.nativeElement.offsetHeight * 0.3
    }px`;
    this.result = `${width},${height}`;
  }

  onDeviceSelectChange(selected: string) {
    const device = this.availableDevices$
      .getValue()
      .find((x) => x.deviceId === selected);
    this.currentDevice$.next(device);
  }

  stop() {
    if (!this.stream) return;
    this.stream.getTracks().forEach((track) => {
      track.stop();
    });
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

  test = 0;

  draw() {
    if (this.video.nativeElement.paused || this.video.nativeElement.ended)
      return;

    requestAnimationFrame(this.draw.bind(this));

    this.message = ++this.test;
    // this.drawMiddleRect();

    if (++this.frameCount === this.scanPeriod) {
      this.frameCount = 0;
    } else {
      return;
    }

    this.copyVideo();
    this.captureImage();
    this.decodeImage();
  }

  copyVideo() {
    const ctx = this.mainCanvas.nativeElement.getContext('2d');
    ctx.drawImage(this.video.nativeElement, 0, 0);
  }

  drawMiddleRect() {
    let ctx = this.mainCanvas.nativeElement.getContext('2d');
    const { dash, lineWidth, color, x0, y0, width, height } = this.cropSetting;

    ctx.save();
    ctx.setLineDash(dash);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;

    ctx.strokeRect(x0, y0, width, height);
    ctx.restore();
  }

  captureImage() {
    const { x0, y0, width, height } = this.cropSetting;
    const mainCtx = this.mainCanvas.nativeElement.getContext('2d');
    const resultCtx = this.snapshotCanvas.nativeElement.getContext('2d');
    let img = mainCtx.getImageData(x0, y0, width, height);
    resultCtx.clearRect(0, 0, width, height);
    resultCtx.putImageData(img, 0, 0);
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

    const mainResult = this.mainResult.nativeElement;
    const snapshotResult = this.snapshotResult.nativeElement;
    const { x0, y0 } = this.cropSetting;

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
    const mainResult = this.mainResult.nativeElement;
    const snapshotResult = this.snapshotResult.nativeElement;

    const pointersCtx = mainResult.getContext('2d');
    const resultCtx = snapshotResult.getContext('2d');

    pointersCtx.clearRect(0, 0, mainResult.width, mainResult.height);
    resultCtx.clearRect(0, 0, snapshotResult.width, snapshotResult.height);
  }
}
