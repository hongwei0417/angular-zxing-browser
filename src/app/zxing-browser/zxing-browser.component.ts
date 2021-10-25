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

  private _scannerSetting = null;
  private _hints: Map<DecodeHintType, any> | null = new Map<
    DecodeHintType,
    any
  >();

  currentDevice$ = new BehaviorSubject<MediaDeviceInfo>(null);
  availableDevices$ = new BehaviorSubject<MediaDeviceInfo[]>([]);
  resultPoints$ = new BehaviorSubject<ResultPoint[]>([]);
  videoLoaded$: Observable<Event>;
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

  set scannerSetting(data) {
    this._scannerSetting = data;
  }
  get scannerSetting() {
    let width = this.mainCanvas.nativeElement.width;
    let height = this.mainCanvas.nativeElement.height;
    let rectHeight = this._scannerSetting?.reactHeight || height * 0.2;
    let rectWidth = this._scannerSetting?.rectWidth || width * 0.7;
    let color = this._scannerSetting?.color || 'red';
    let dash = this._scannerSetting?.dash || [5, 10];
    let lineWidth = this._scannerSetting?.lineWidth || 3;
    let x = width / 2 - rectWidth / 2;
    let y = height / 2 - rectHeight / 2;
    return {
      x,
      y,
      width: rectWidth,
      height: rectHeight,
      color,
      dash,
      lineWidth,
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
  }

  ngAfterViewInit(): void {
    this.videoLoaded$ = fromEvent(this.video.nativeElement, 'loadedmetadata');
    this.initVideo();
    this.initAnalyzer();
  }

  initVideo() {
    this.videoLoaded$.subscribe(this.loadCanvas.bind(this));
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
    const { videoWidth, videoHeight } = this.video.nativeElement;
    this.mainCanvas.nativeElement.width = videoWidth;
    this.mainCanvas.nativeElement.height = videoHeight;
    this.mainResult.nativeElement.width = videoWidth;
    this.mainResult.nativeElement.height = videoHeight;
    this.draw();
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
  }

  changeDevice(device: MediaDeviceInfo) {
    if (!device) {
      this.stop();
      return;
    }
    const constrains = {
      ...this.constrains,
      video: {
        deviceId: {
          exact: device.deviceId,
        },
        width: 1920,
        height: 1080,
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

    this.message = ++this.test;
    this.copyVideo();
    this.drawMiddleRect();
    requestAnimationFrame(this.draw.bind(this));

    if (++this.frameCount === this.scanPeriod) {
      this.frameCount = 0;
    } else {
      return;
    }

    this.captureImage();
    this.decodeImage();
  }

  copyVideo() {
    const ctx = this.mainCanvas.nativeElement.getContext('2d');
    ctx.drawImage(this.video.nativeElement, 0, 0);
  }

  drawMiddleRect() {
    let ctx = this.mainCanvas.nativeElement.getContext('2d');
    const { dash, lineWidth, color, x, y, width, height } = this.scannerSetting;

    ctx.save();
    ctx.setLineDash(dash);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;

    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  captureImage() {
    const { x, y, width, height } = this.scannerSetting;
    const snapshotCanvas = this.snapshotCanvas.nativeElement;
    const snapshotResult = this.snapshotResult.nativeElement;
    snapshotCanvas.width = width;
    snapshotCanvas.height = height;
    snapshotResult.width = width;
    snapshotResult.height = height;
    const mainCtx = this.mainCanvas.nativeElement.getContext('2d');
    const resultCtx = snapshotCanvas.getContext('2d');
    let img = mainCtx.getImageData(x, y, width, height);
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
    const { x, y, width, height } = this.scannerSetting;

    this.drawPoints(
      mainResult,
      resultPoints.map((p) => {
        return { x: x + p.getX(), y: y + p.getY() };
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
