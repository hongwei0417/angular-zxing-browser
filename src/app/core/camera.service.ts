import { ElementRef, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CameraService {
  camera: ElementRef<HTMLVideoElement>;
  currentDevice$ = new BehaviorSubject<MediaDeviceInfo>(null);
  availableDevices$ = new BehaviorSubject<MediaDeviceInfo[]>([]);
  error$ = new BehaviorSubject<any>('');
  videoLoaded$: Observable<Event>;
  constrains: any;
  stream: any;
  active: boolean;
  hasPermission: boolean;
  hasDevices: boolean;

  constructor() {}

  get videoResolution() {
    return {
      width: { min: 1280, ideal: 1920, max: 1920 },
      height: { min: 720, ideal: 1080, max: 1080 },
    };
  }

  init(video: ElementRef<HTMLVideoElement>) {
    this.camera = video;
    this.constrains = { audio: false, video: true };
    this.currentDevice$.subscribe(this.loadStream.bind(this));
  }

  stop() {
    if (!this.stream) return;
    this.stream.getTracks().forEach((track) => {
      track.stop();
    });
    this.stream = null;
    this.camera.nativeElement.srcObject = null;
    this.active = false;
  }

  async loadStream() {
    try {
      this.stop();
      const stream = await navigator.mediaDevices.getUserMedia(this.constrains);
      this.hasPermission = true;
      console.log(this.constrains);

      if (this.currentDevice$.getValue()) {
        this.camera.nativeElement.srcObject = stream;
        this.camera.nativeElement.play();
        this.stream = stream;
        this.active = true;
      }
      await this.loadDevices();
    } catch (error) {
      this.error$.next(error);
    }
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
    this.currentDevice$.next(device);
  }

  pauseAndPlay() {
    if (this.camera.nativeElement.paused) {
      this.camera.nativeElement.play();
    } else {
      this.camera.nativeElement.pause();
    }
  }
}
