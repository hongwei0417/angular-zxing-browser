import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxScannerComponent } from './ngx-scanner.component';

describe('NgxScannerComponent', () => {
  let component: NgxScannerComponent;
  let fixture: ComponentFixture<NgxScannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NgxScannerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
