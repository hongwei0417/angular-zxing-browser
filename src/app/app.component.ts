import { Component } from '@angular/core';
import { BarcodeFormat, Result } from '@zxing/library';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'ngx-scanner-test';
  availableDevices: MediaDeviceInfo[];
  currentDevice: MediaDeviceInfo = null;
  hasPermission = false;
  formats: BarcodeFormat[] = [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.CODABAR,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.CODE_128,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.ITF,
    BarcodeFormat.EAN_13,
  ];
  result = '';
  msg: any = null;

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices = devices;
  }

  onHasPermission(has: boolean): void {
    this.hasPermission = has;
  }

  onScanSuccess(result: string): void {
    this.result = result;
  }

  onScanComplete(result: Result): void {
    this.msg = result;
  }

  onDeviceSelectChange(selected: string): void {
    const device = this.availableDevices.find((x) => x.deviceId === selected);
    this.currentDevice = device || null;
  }
}
