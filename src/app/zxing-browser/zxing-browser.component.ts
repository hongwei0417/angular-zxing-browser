import { ProcessControlService } from './../core/process-control.service';
import { NativeImgProcessService } from './../core/native-img-process.service';
import { OpencvService } from './../core/opencv.service';
import { LoggerService } from './../core/logger.service';
import { DecoderService } from './../core/decoder.service';
import { ScannerService } from './../core/scanner.service';
import { CameraService } from './../core/camera.service';
import { DeviceType } from './../deviceType';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BarcodeFormat } from '@zxing/library';
import { BehaviorSubject, fromEvent, Observable, of, Subject } from 'rxjs';
import { AppInfoDialogComponent } from '../app-info-dialog/app-info-dialog.component';
import { FormatsDialogComponent } from '../formats-dialog/formats-dialog.component';
import interact from 'interactjs';
import { MatSliderChange } from '@angular/material/slider';

@Component({
  selector: 'app-zxing-browser',
  templateUrl: './zxing-browser.component.html',
  styleUrls: ['./zxing-browser.component.scss'],
})
export class ZxingBrowserComponent implements OnInit, AfterViewInit {
  @ViewChild('video') video: ElementRef<HTMLVideoElement>;
  @ViewChild('scanResultCanvas')
  scanResultCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('snapshotCanvas') snapshotCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('snapshotScanResultCanvas')
  snapshotScanResultCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('filteredSnapshotCanvas')
  filteredSnapshotCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('barcodeCanvas') barcodeCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('scannerContainer') scannerContainer: ElementRef<HTMLDivElement>;
  @ViewChild('scannerArea') scannerArea: ElementRef<HTMLDivElement>;
  @ViewChild('snapshotContainer') snapshotContainer: ElementRef<HTMLDivElement>;
  @ViewChild('dataMatrixTemplateImage')
  dataMatrixTemplateImage: ElementRef<HTMLImageElement>;

  availableDevices$: Observable<MediaDeviceInfo[]>;
  currentDevice$: Observable<MediaDeviceInfo>;

  formatsEnabled: BarcodeFormat[] = [
    // BarcodeFormat.CODE_128,
    BarcodeFormat.DATA_MATRIX,
    // BarcodeFormat.EAN_13,
    // BarcodeFormat.QR_CODE,
  ];

  hasDevices: boolean;
  hasPermission: boolean;
  result$: Observable<any>;
  message$: Observable<any>;
  error$: Observable<any>;
  enableGrayscale$: Observable<boolean>;
  enableEqualization$: Observable<boolean>;
  enableInvertColor$: Observable<boolean>;
  enableThreshold$: Observable<boolean>;
  enableBlur$: Observable<boolean>;
  blurValue$: Observable<number>;
  thresHoldValue$: Observable<number>;
  zoomRatio$: Observable<number>;
  frameCount$: Observable<number>;

  availableScanMode = ['auto', '1D', '2D'];
  currentScanMode = this.availableScanMode[0];
  PROCESS_METHOD = 2;

  constructor(
    private readonly _dialog: MatDialog,
    private cameraService: CameraService,
    private scannerService: ScannerService,
    private decoderService: DecoderService,
    private opencvService: OpencvService,
    private loggerService: LoggerService,
    private processControlService: ProcessControlService
  ) {}

  ngOnInit(): void {
    this.availableDevices$ =
      this.cameraService.availableDevices$.asObservable();
    this.currentDevice$ = this.cameraService.currentDevice$.asObservable();
    this.result$ = this.decoderService.result$.asObservable();
    this.message$ = this.loggerService.message$.asObservable();
    this.error$ = this.loggerService.error$.asObservable();
    this.blurValue$ = this.processControlService.blurValue$.asObservable();
    this.thresHoldValue$ =
      this.processControlService.thresHoldValue$.asObservable();
    this.enableGrayscale$ =
      this.processControlService.enableGrayscale$.asObservable();
    this.enableEqualization$ =
      this.processControlService.enableEqualization$.asObservable();
    this.enableInvertColor$ =
      this.processControlService.enableInvertColor$.asObservable();
    this.enableThreshold$ =
      this.processControlService.enableThreshold$.asObservable();
  }

  ngAfterViewInit(): void {
    this.cameraService.init(this.video);
    this.scannerService.init(
      this.scannerArea,
      this.scannerContainer,
      this.scanResultCanvas,
      this.snapshotCanvas,
      this.snapshotContainer,
      this.snapshotScanResultCanvas
    );
    this.decoderService.formats = this.formatsEnabled;
    this.opencvService.loaded.subscribe((loaded) => {
      if (loaded) {
        this.changeImageProcessMethod();
      }
    });
    this.initInteract();
  }

  changeImageProcessMethod() {
    const processes = {
      1: () => {
        this.processControlService.matchOneTemplate(
          this.snapshotCanvas,
          this.filteredSnapshotCanvas,
          this.barcodeCanvas,
          this.dataMatrixTemplateImage
        );
      },
      2: () => {
        this.processControlService.contours(
          this.snapshotCanvas,
          this.filteredSnapshotCanvas,
          this.barcodeCanvas
        );
      },
      3: () => {
        this.processControlService.nativeImageFilter(this.snapshotCanvas);
      },
    };
    this.scannerService.setImageProcessCallback(processes[this.PROCESS_METHOD]);
  }

  onDeviceSelectChange(selected: string) {
    this.cameraService.changeDevice(
      this.cameraService.availableDevices$
        .getValue()
        .find((x) => x.deviceId === selected)
    );
  }

  setScannerArea(mode: string) {
    const getAspect = {
      auto: () => {
        return { width: '320px', height: '320px' };
      },
      '1D': () => {
        return { width: '800px', height: '200px' };
      },
      '2D': () => {
        return { width: '500px', height: '500px' };
      },
    };
    const { width, height } = getAspect[mode]();
    this.scannerArea.nativeElement.style.width = width;
    this.scannerArea.nativeElement.style.height = height;
  }

  onScanModeSelectChange(selected: string) {
    this.setScannerArea(selected);
    this.scannerService.resizeWindow();
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
          this.decoderService.formats = this.formatsEnabled;
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

  onEnableImageFilter(type: string) {
    const action = {
      grayScale: () => {
        this.processControlService.enableGrayscale$.next(
          !this.processControlService.enableGrayscale$.getValue()
        );
      },
      equalization: () => {
        this.processControlService.enableEqualization$.next(
          !this.processControlService.enableEqualization$.getValue()
        );
      },
      invertColor: () => {
        this.processControlService.enableInvertColor$.next(
          !this.processControlService.enableInvertColor$.getValue()
        );
      },
      thresHold: () => {
        this.processControlService.enableThreshold$.next(
          !this.processControlService.enableThreshold$.getValue()
        );
      },
      blur: () => {
        this.processControlService.enableBlur$.next(
          !this.processControlService.enableBlur$.getValue()
        );
      },
    };
    action[type]();
  }

  clearResult(): void {
    this.decoderService.result$.next(null);
  }

  clearMessage(): void {
    this.loggerService.message$.next(null);
  }

  clearError(): void {
    this.loggerService.error$.next(null);
  }

  initInteract(): void {
    interact('.snapshot-container')
      .resizable({
        // resize from all edges and corners
        edges: { left: true, right: true, bottom: true, top: true },

        listeners: {
          move(event) {
            var target = event.target;
            var x = parseFloat(target.getAttribute('data-x')) || 0;
            var y = parseFloat(target.getAttribute('data-y')) || 0;

            // update the element's style
            target.style.width = event.rect.width + 'px';
            target.style.height = event.rect.height + 'px';

            // translate when resizing from top or left edges
            x += event.deltaRect.left;
            y += event.deltaRect.top;

            target.style.transform = `translate(${x}px,${y}px)`;

            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
          },
        },
        modifiers: [
          // keep the edges inside the parent
          interact.modifiers.restrictEdges({
            outer: 'parent',
          }),
          // minimum size
          interact.modifiers.restrictSize({
            min: { width: 100, height: 50 },
          }),
        ],

        inertia: true,
      })
      .draggable({
        listeners: { move: dragMoveListener },
        inertia: true,
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: 'parent',
            endOnly: true,
          }),
        ],
      });

    function dragMoveListener(event) {
      var target = event.target;
      // keep the dragged position in the data-x/data-y attributes
      var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
      var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

      // translate the element
      target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

      // update the posiion attributes
      target.setAttribute('data-x', x);
      target.setAttribute('data-y', y);
    }
  }

  onZoomChange(change: MatSliderChange): void {
    this.scannerService.zoomRatio$.next(change.value);
  }

  onThresHoldChange(change: MatSliderChange): void {
    this.processControlService.thresHoldValue$.next(change.value);
  }

  onBlurChange(change: MatSliderChange): void {
    this.processControlService.blurValue$.next(change.value);
  }
}
