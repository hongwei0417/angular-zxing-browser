import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BarcodeFormat, Result, ResultPoint } from '@zxing/library';
import { ZXingScannerComponent } from '@zxing/ngx-scanner';
import { BehaviorSubject } from 'rxjs';
import { AppInfoDialogComponent } from '../app-info-dialog/app-info-dialog.component';
import { FormatsDialogComponent } from '../formats-dialog/formats-dialog.component';

@Component({
  selector: 'app-ngx-scanner',
  templateUrl: './ngx-scanner.component.html',
  styleUrls: ['./ngx-scanner.component.scss'],
})
export class NgxScannerComponent implements OnInit {
  availableDevices: MediaDeviceInfo[];
  currentDevice: MediaDeviceInfo = null;
  constraints: MediaTrackConstraints;

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

  @ViewChild('scanner') scanner: ZXingScannerComponent;
  @ViewChild('canvas') canvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('video') video: ElementRef<HTMLVideoElement>;

  public context: CanvasRenderingContext2D;

  ngAfterViewInit(): void {
    console.log(this.scanner);
  }

  ngOnInit(): void {}

  clearResult(): void {
    this.qrResultString = null;
  }

  clearMessage(): void {
    this.message = null;
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices = devices;
    this.hasDevices = Boolean(devices && devices.length);
  }

  onCodeResult(resultString: string) {
    console.log(resultString);
    this.qrResultString = resultString;
  }

  onDeviceSelectChange(selected: string) {
    const device = this.availableDevices.find((x) => x.deviceId === selected);
    this.currentDevice = device || null;
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

  onHasPermission(has: boolean) {
    this.hasPermission = has;
  }

  openInfoDialog() {
    const data = {
      hasDevices: this.hasDevices,
      hasPermission: this.hasPermission,
    };

    this._dialog.open(AppInfoDialogComponent, { data });
  }

  onTorchCompatible(isCompatible: boolean): void {
    this.torchAvailable$.next(isCompatible || false);
  }

  onScanComplete(result: Result): void {
    console.log(result);
    if (!result) return;
    this.drawFrame(result.getResultPoints());
  }

  drawFrame(resultPoints: ResultPoint[]): void {
    if (resultPoints.length === 0) return;

    const canvas = this.canvas.nativeElement;
    const video = this.scanner.previewElemRef.nativeElement;
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

  toggleTorch(): void {
    this.torchEnabled = !this.torchEnabled;
  }

  toggleTryHarder(): void {
    this.tryHarder = !this.tryHarder;
  }
}
