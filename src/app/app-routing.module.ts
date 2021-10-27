import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NgxScannerComponent } from './ngx-scanner/ngx-scanner.component';
import { ZxingBrowserComponent } from './zxing-browser/zxing-browser.component';

const routes: Routes = [
  { path: 'browser', component: ZxingBrowserComponent },
  { path: 'ngx', component: NgxScannerComponent },
  { path: '', redirectTo: '/browser', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
