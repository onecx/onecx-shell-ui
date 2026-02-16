import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AboutComponent } from './about.component'
import { TranslateModule } from '@ngx-translate/core';


describe('AboutComponent', () => {
    let fixture: ComponentFixture<AboutComponent>;
    let component: AboutComponent

    const magicChar = String.fromCodePoint(0x10ffff)


    function mockWebpackContainer(entries: Record<string, any>) {
        (window as any).onecxWebpackContainer = {
            default: {
                ['@angular/core']: entries,
            },
        };
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                AboutComponent,
                TranslateModule.forRoot(),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AboutComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        delete (window as any).onecxWebpackContainer;
        jest.restoreAllMocks();
    });

    it('builds supportedAngularVersions from OnecxWebpackContainer entries', () => {
        mockWebpackContainer({
            '18.2.14': { from: magicChar + 'onecx-angular-18-loader', eager: false, loaded: 1 },
            '19.2.17': { from: magicChar + 'onecx-angular-19-loader', eager: false},
            '20.3.15': { from: magicChar + 'onecx-angular-20-loader', eager: false},
        });

        fixture.detectChanges();

        expect(component.supportedAngularVersions).toHaveLength(3);
        expect(component.supportedAngularVersions[0]).toEqual(
            expect.objectContaining({
                name: 'Angular 18',
                version: '18.2.14',
                from: 'onecx-angular-18-loader',
                eager: false,
                loaded: 1,
            })
        );

        expect(component.supportedAngularVersions[1]).toEqual(
            expect.objectContaining({
                name: 'Angular 19',
                version: '19.2.17',
                from: 'onecx-angular-19-loader',
                eager: false,
                loaded: 0,
            })
        );

        expect(component.supportedAngularVersions[2]).toEqual(
            expect.objectContaining({
                name: 'Angular 20',
                version: '20.3.15',
                from: 'onecx-angular-20-loader',
                eager: false,
                loaded: 0,
            })
        );
    });

    it('filters out entries without magicChar prefix', () => {
        mockWebpackContainer({
            '18.2.12': { from: 'onecx-workspace-ui', eager: false }, // no magic char -> ignore
            '18.2.14': { from: magicChar + 'onecx-angular-18-loader', eager: false, loaded: 1 },
            '19.2.17': { from: magicChar + 'onecx-angular-19-loader', eager: false},
            '20.3.15': { from: magicChar + 'onecx-angular-20-loader', eager: false},
        });

        fixture.detectChanges();

        expect(component.supportedAngularVersions).toHaveLength(3);
        expect(component.supportedAngularVersions[0].version).toBe('18.2.14');
        expect(component.supportedAngularVersions[1].version).toBe('19.2.17');
        expect(component.supportedAngularVersions[2].version).toBe('20.3.15');
    });
})
