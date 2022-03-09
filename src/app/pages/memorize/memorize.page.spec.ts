import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MemorizePage } from './memorize.page';

describe('MemorizePage', () => {
  let component: MemorizePage;
  let fixture: ComponentFixture<MemorizePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MemorizePage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MemorizePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
