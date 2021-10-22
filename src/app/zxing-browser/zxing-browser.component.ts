import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  BarcodeFormat,
  BinaryBitmap,
  Result,
  ResultPoint,
} from '@zxing/library';
import { BehaviorSubject, fromEvent, Observable, Subject } from 'rxjs';
import { AppInfoDialogComponent } from '../app-info-dialog/app-info-dialog.component';
import { FormatsDialogComponent } from '../formats-dialog/formats-dialog.component';

@Component({
  selector: 'app-zxing-browser',
  templateUrl: './zxing-browser.component.html',
  styleUrls: ['./zxing-browser.component.scss'],
})
export class ZxingBrowserComponent implements OnInit {
  @ViewChild('video') video: ElementRef<HTMLVideoElement>;
  @ViewChild('mainCanvas') mainCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('resultCanvas') resultCanvas: ElementRef<HTMLCanvasElement>;

  currentDevice$ = new BehaviorSubject<MediaDeviceInfo>(null);
  availableDevices$ = new BehaviorSubject<MediaDeviceInfo[]>([]);
  videoLoaded$: Observable<Event>;
  userMedia$ = new Subject();
  scanner$ = new Subject();
  _scannerSetting = null;
  codeReader: BrowserMultiFormatReader;

  set scannerSetting(setting) {
    this._scannerSetting = setting;
  }
  get scannerSetting() {
    let width = this.mainCanvas.nativeElement.width;
    let height = this.mainCanvas.nativeElement.height;
    let rectWidth = this._scannerSetting?.rectWidth || 300;
    let color = this._scannerSetting?.color || 'red';
    let dash = this._scannerSetting?.dash || [5, 10];
    let lineWidth = this._scannerSetting?.lineWidth || 3;
    let x = width / 2 - rectWidth / 2;
    let y = height / 2 - rectWidth / 2;
    return {
      x,
      y,
      width: rectWidth,
      height: rectWidth,
      color,
      dash,
      lineWidth,
    };
  }

  constrains = {
    audio: false,
    video: {
      deviceId: null,
      width: 1920,
      height: 1080,
    },
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

  qrResultString: string;
  message: any;

  torchEnabled = false;
  torchAvailable$ = new BehaviorSubject<boolean>(false);
  tryHarder = false;

  constructor(private readonly _dialog: MatDialog) {}

  public context: CanvasRenderingContext2D;

  ngOnInit(): void {
    this.currentDevice$.subscribe(this.changeDevice.bind(this));
    this.userMedia$.subscribe(this.loadStream.bind(this));
    this.scanner$.subscribe(this.drawMiddleRect.bind(this));
    this.scanner$.subscribe(this.takeImage.bind(this));
  }

  ngAfterViewInit(): void {
    this.videoLoaded$ = fromEvent(this.video.nativeElement, 'loadedmetadata');
    this.initVideo();
    this.initAnalyzer();
  }

  initVideo() {
    this.video.nativeElement.style.display = 'none';
    this.videoLoaded$.subscribe(this.loadCanvas.bind(this));
    this.userMedia$.next();
  }

  initAnalyzer() {
    this.codeReader = new BrowserMultiFormatReader();
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
      this.video.nativeElement.srcObject = stream;
      this.stream = stream;
      this.loadDevices();
    } catch (error) {
      console.log(error);
    }
  }

  loadCanvas() {
    this.mainCanvas.nativeElement.width = this.video.nativeElement.videoWidth;
    this.mainCanvas.nativeElement.height = this.video.nativeElement.videoHeight;
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
    if (!device) return;
    this.constrains.video.deviceId = device.deviceId;
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
          this.formatsEnabled = x;
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
    this.qrResultString = null;
  }

  clearMessage(): void {
    this.message = null;
  }

  draw() {
    if (this.video.nativeElement.paused || this.video.nativeElement.ended)
      return false;

    this.copyVideo();
    this.scanner$.next();
  }

  copyVideo() {
    const ctx = this.mainCanvas.nativeElement.getContext('2d');
    ctx.drawImage(this.video.nativeElement, 0, 0);
    requestAnimationFrame(this.draw.bind(this));
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

  takeImage() {
    const { x, y, width, height } = this.scannerSetting;
    this.resultCanvas.nativeElement.width = width;
    this.resultCanvas.nativeElement.height = height;
    const mainCtx = this.mainCanvas.nativeElement.getContext('2d');
    const resultCtx = this.resultCanvas.nativeElement.getContext('2d');
    let img = mainCtx.getImageData(x, y, width, height);
    resultCtx.putImageData(img, 0, 0);
    setTimeout(() => {
      this.decodeImg();
    }, 3000);
  }

  async decodeImg() {
    try {
      const result = this.codeReader.decodeFromCanvas(
        this.resultCanvas.nativeElement
      );
      console.log(result);
    } catch (error) {
      console.log('Not Found Result');
    }
  }

  drawFrame(resultPoints: ResultPoint[]): void {
    if (resultPoints.length === 0) return;

    const canvas = this.mainCanvas.nativeElement;
    const video = this.video.nativeElement;
    const { clientWidth, clientHeight, videoWidth, videoHeight } = video;
    const widthRatio = clientWidth / videoWidth;
    const heightRatio = clientHeight / videoHeight;

    // set canvas
    canvas.width = clientWidth;
    canvas.height = clientHeight;
    this.context = canvas.getContext('2d');
    this.context.lineWidth = 2;
    this.context.strokeStyle = 'red';

    // draw canvas
    this.context.beginPath();
    this.context.moveTo(
      resultPoints[0].getX() * widthRatio,
      resultPoints[0].getY() * heightRatio
    );
    resultPoints.slice(1).forEach((p) => {
      this.context.lineTo(p.getX() * widthRatio, p.getY() * heightRatio);
    });
    this.context.closePath();
    this.context.stroke();
  }
}
