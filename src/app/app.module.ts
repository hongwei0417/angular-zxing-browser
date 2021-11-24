import { ZxingBrowserComponent } from './zxing-browser/zxing-browser.component';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from '../environments/environment';
import { AppInfoDialogComponent } from './app-info-dialog/app-info-dialog.component';
import { AppInfoComponent } from './app-info/app-info.component';
import { UiModule } from './ui.module';
import { AppComponent } from './app.component';
import { FormatsDialogComponent } from './formats-dialog/formats-dialog.component';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { NgxScannerComponent } from './ngx-scanner/ngx-scanner.component';
import { AppRoutingModule } from './app-routing.module';
import { NgOpenCVModule } from 'ng-open-cv';
import { OpenCVOptions } from 'ng-open-cv/public_api';

const openCVConfig: OpenCVOptions = {
  scriptUrl: `assets/opencv/opencv.js`,
  wasmBinaryFile: 'wasm/opencv_js.wasm',
  usingWasm: true,
};

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    UiModule,
    ZXingScannerModule,
    AppRoutingModule,
    NgOpenCVModule.forRoot(openCVConfig),
  ],
  declarations: [
    AppComponent,
    FormatsDialogComponent,
    AppInfoComponent,
    AppInfoDialogComponent,
    ZxingBrowserComponent,
    NgxScannerComponent,
  ],
  bootstrap: [AppComponent],
  entryComponents: [FormatsDialogComponent, AppInfoDialogComponent],
})
export class AppModule {}
