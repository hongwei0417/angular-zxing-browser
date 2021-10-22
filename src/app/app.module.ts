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

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    UiModule,
    ZXingScannerModule,
    AppRoutingModule,
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
