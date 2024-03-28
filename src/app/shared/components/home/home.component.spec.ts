import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfigurationService } from '@onecx/portal-integration-angular';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  const mockConfigurationService = {
    getPortal: jest.fn(() => {
      return { id: 'id1', portalName: 'PortalName' };
    }),
  };
  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [HomeComponent],
      providers: [
        {
          provide: ConfigurationService,
          useValue: mockConfigurationService,
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
