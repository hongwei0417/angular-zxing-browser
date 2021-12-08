import { TestBed } from '@angular/core/testing';

import { OpencvService } from './opencv.service';

describe('OpencvService', () => {
  let service: OpencvService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpencvService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
