import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ControlService {
  enableGrayscale$ = new BehaviorSubject<boolean>(true);
  enableEqualization$ = new BehaviorSubject<boolean>(false);
  enableInvertColor$ = new BehaviorSubject<boolean>(true);
  enableThreshold$ = new BehaviorSubject<boolean>(true);
  enableBlur$ = new BehaviorSubject<boolean>(false);
  blurValue$ = new BehaviorSubject<number>(10);
  thresHoldValue$ = new BehaviorSubject<number>(0);

  constructor() {}
}
