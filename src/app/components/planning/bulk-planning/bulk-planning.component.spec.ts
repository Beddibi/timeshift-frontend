import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BulkPlanningComponent } from './bulk-planning.component';

describe('BulkPlanningComponent', () => {
  let component: BulkPlanningComponent;
  let fixture: ComponentFixture<BulkPlanningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkPlanningComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BulkPlanningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
