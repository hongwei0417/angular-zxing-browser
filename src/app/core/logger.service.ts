import { NativeImgProcessService } from './native-img-process.service';
import { OpencvService } from './opencv.service';
import { ScannerService } from './scanner.service';
import { CameraService } from './camera.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, merge } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  message$ = new BehaviorSubject<string>('');
  error$ = new BehaviorSubject<any>('');

  constructor(
    private cameraService: CameraService,
    private scannerService: ScannerService,
    private opencvService: OpencvService,
    private nativeImgProcessService: NativeImgProcessService
  ) {
    combineLatest([
      this.cameraService.error$.asObservable(),
      this.scannerService.error$.asObservable(),
      this.opencvService.error$.asObservable(),
      this.nativeImgProcessService.error$.asObservable(),
    ]).subscribe(([error1, error2, error3, error4]) => {
      let error =
        error1 || error2 || error3 || error4
          ? JSON.stringify({
              camera: error1.toString() || '',
              scanner: error2.toString() || '',
              opencv: error3.toString() || '',
              nativeProcess: error4.toString() || '',
            })
          : '';
      this.error$.next(error);
    });
  }
}
