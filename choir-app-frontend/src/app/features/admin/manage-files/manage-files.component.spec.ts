import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ManageFilesComponent } from './manage-files.component';
import { ApiService } from 'src/app/core/services/api.service';
import { DialogHelperService } from '@core/services/dialog-helper.service';
import { ResponsiveService } from '@shared/services/responsive.service';

describe('ManageFilesComponent', () => {
  let component: ManageFilesComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageFilesComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            listUploadFiles: () => of({ covers: [], images: [], files: [], usage: { covers: 0, images: 0, files: 0, total: 0 } }),
            deleteUploadFile: () => of({})
          }
        },
        {
          provide: DialogHelperService,
          useValue: {
            confirmDelete: () => of(true)
          }
        },
        {
          provide: ResponsiveService,
          useValue: {
            isHandset$: of(false)
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ManageFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build file download URL via /api/uploads and encode filename', () => {
    const url = component.getFileUrl('Brahms Requiem 1.pdf');

    expect(url).toContain('/api/uploads/piece-files/');
    expect(url).toContain('Brahms%20Requiem%201.pdf');
  });

  it('should build cover and image URLs via /api/uploads', () => {
    const coverUrl = component.getCoverUrl('cover image.png');
    const imageUrl = component.getImageUrl('noten bild.jpg');

    expect(coverUrl).toContain('/api/uploads/collection-covers/');
    expect(imageUrl).toContain('/api/uploads/piece-images/');
  });
});
