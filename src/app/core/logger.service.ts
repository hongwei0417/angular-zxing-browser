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
    private scannerService: ScannerService
  ) {
    combineLatest([
      this.cameraService.error$.asObservable(),
      this.scannerService.error$.asObservable(),
    ]).subscribe(([error1, error2]) => {
      let error =
        error1 || error2
          ? JSON.stringify({
              camera: error1.toString() || '',
              scanner: error2.toString() || '',
            })
          : '';
      this.error$.next(error);
    });
  }
}
