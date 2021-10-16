import { Component } from '@angular/core';

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
  result = '';

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices = devices;
  }

  onHasPermission(has: boolean): void {
    this.hasPermission = has;
  }

  onScanSuccess(result: string): void {
    this.result = result;
  }

  onDeviceSelectChange(selected: string): void {
    const device = this.availableDevices.find((x) => x.deviceId === selected);
    this.currentDevice = device || null;
  }
}
