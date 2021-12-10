import { TestBed } from '@angular/core/testing';

import { NativeImgProcessService } from './native-img-process.service';

describe('NativeImgProcessService', () => {
  let service: NativeImgProcessService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NativeImgProcessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
