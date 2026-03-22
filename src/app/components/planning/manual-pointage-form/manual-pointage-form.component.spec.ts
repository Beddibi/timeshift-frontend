import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManualPointageFormComponent } from './manual-pointage-form.component';

describe('ManualPointageFormComponent', () => {
  let component: ManualPointageFormComponent;
  let fixture: ComponentFixture<ManualPointageFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManualPointageFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManualPointageFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
