import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZxingBrowserComponent } from './zxing-browser.component';

describe('ZxingBrowserComponent', () => {
  let component: ZxingBrowserComponent;
  let fixture: ComponentFixture<ZxingBrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ZxingBrowserComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ZxingBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
