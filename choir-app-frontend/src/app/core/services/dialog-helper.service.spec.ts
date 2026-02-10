import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { DialogHelperService, DialogApiConfig, ConfirmOptions, DeleteConfirmOptions } from './dialog-helper.service';
import { ApiHelperService } from './api-helper.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

describe('DialogHelperService', () => {
  let service: DialogHelperService;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let apiHelperSpy: jasmine.SpyObj<ApiHelperService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<any>>;

  beforeEach(() => {
    // Create spy objects
    dialogRefSpy = jasmine.createSpyObj('MatDialog Ref', ['afterClosed']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    apiHelperSpy = jasmine.createSpyObj('ApiHelperService', ['handleApiCall']);

    // Setup default behaviors
    dialogSpy.open.and.returnValue(dialogRefSpy);
    apiHelperSpy.handleApiCall.and.callFake((observable: any) => observable);

    TestBed.configureTestingModule({
      providers: [
        DialogHelperService,
        { provide: MatDialog, useValue: dialogSpy },
        { provide: ApiHelperService, useValue: apiHelperSpy }
      ]
    });

    service = TestBed.inject(DialogHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('openDialog', () => {
    it('should open dialog with default width of 600px', () => {
      const mockComponent = class MockComponent {};
      dialogRefSpy.afterClosed.and.returnValue(of({ id: 1, name: 'Test' }));

      service.openDialog(mockComponent).subscribe();

      expect(dialogSpy.open).toHaveBeenCalledWith(mockComponent, jasmine.objectContaining({
        width: '600px'
      }));
    });

    it('should open dialog with custom width', () => {
      const mockComponent = class MockComponent {};
      dialogRefSpy.afterClosed.and.returnValue(of(null));

      service.openDialog(mockComponent, { width: '800px' }).subscribe();

      expect(dialogSpy.open).toHaveBeenCalledWith(mockComponent, jasmine.objectContaining({
        width: '800px'
      }));
    });

    it('should return dialog result as observable', (done) => {
      const mockComponent = class MockComponent {};
      const mockResult = { id: 1, name: 'Test' };
      dialogRefSpy.afterClosed.and.returnValue(of(mockResult));

      service.openDialog(mockComponent).subscribe(result => {
        expect(result).toEqual(mockResult);
        done();
      });
    });

    it('should pass dialog data correctly', () => {
      const mockComponent = class MockComponent {};
      const mockData = { userId: 123 };
      dialogRefSpy.afterClosed.and.returnValue(of(null));

      service.openDialog(mockComponent, { data: mockData }).subscribe();

      expect(dialogSpy.open).toHaveBeenCalledWith(mockComponent, jasmine.objectContaining({
        data: mockData
      }));
    });

    it('should pass other MatDialogConfig options', () => {
      const mockComponent = class MockComponent {};
      dialogRefSpy.afterClosed.and.returnValue(of(null));

      service.openDialog(mockComponent, {
        width: '500px',
        maxWidth: '90vw',
        disableClose: true
      }).subscribe();

      expect(dialogSpy.open).toHaveBeenCalledWith(mockComponent, jasmine.objectContaining({
        width: '500px',
        maxWidth: '90vw',
        disableClose: true
      }));
    });
  });

  describe('openDialogWithApi', () => {
    it('should call API when dialog result is truthy', (done) => {
      const mockComponent = class MockComponent {};
      const dialogResult = { name: 'Test' };
      const apiResponse = { id: 1, name: 'Test' };
      const mockApiCall = jasmine.createSpy('apiCall').and.returnValue(of(apiResponse));

      dialogRefSpy.afterClosed.and.returnValue(of(dialogResult));
      apiHelperSpy.handleApiCall.and.returnValue(of(apiResponse));

      service.openDialogWithApi(mockComponent, mockApiCall).subscribe(result => {
        expect(mockApiCall).toHaveBeenCalledWith(dialogResult);
        expect(apiHelperSpy.handleApiCall).toHaveBeenCalled();
        expect(result).toEqual(apiResponse);
        done();
      });
    });

    it('should skip API call when dialog result is falsy (null)', (done) => {
      const mockComponent = class MockComponent {};
      const mockApiCall = jasmine.createSpy('apiCall').and.returnValue(of({ id: 1 }));

      dialogRefSpy.afterClosed.and.returnValue(of(null));

      service.openDialogWithApi(mockComponent, mockApiCall).subscribe(result => {
        expect(mockApiCall).not.toHaveBeenCalled();
        expect(apiHelperSpy.handleApiCall).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
        done();
      });
    });

    it('should skip API call when dialog result is falsy (undefined)', (done) => {
      const mockComponent = class MockComponent {};
      const mockApiCall = jasmine.createSpy('apiCall').and.returnValue(of({ id: 1 }));

      dialogRefSpy.afterClosed.and.returnValue(of(undefined));

      service.openDialogWithApi(mockComponent, mockApiCall).subscribe(result => {
        expect(mockApiCall).not.toHaveBeenCalled();
        expect(apiHelperSpy.handleApiCall).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
        done();
      });
    });

    it('should transform result before passing to API when transformResult provided', (done) => {
      const mockComponent = class MockComponent {};
      const dialogResult = { name: 'Test', extra: 'data' };
      const transformedResult = { name: 'Test' };
      const apiResponse = { id: 1, name: 'Test' };
      const mockApiCall = jasmine.createSpy('apiCall').and.returnValue(of(apiResponse));

      dialogRefSpy.afterClosed.and.returnValue(of(dialogResult));
      apiHelperSpy.handleApiCall.and.returnValue(of(apiResponse));

      const apiConfig: DialogApiConfig<any, any> = {
        transformResult: (result) => ({ name: result.name })
      };

      service.openDialogWithApi(mockComponent, mockApiCall, { apiConfig }).subscribe(result => {
        expect(mockApiCall).toHaveBeenCalledWith(transformedResult);
        done();
      });
    });

    it('should use custom shouldProceed predicate when provided', (done) => {
      const mockComponent = class MockComponent {};
      const dialogResult = { id: 0, name: '' }; // Falsy values but object is truthy
      const mockApiCall = jasmine.createSpy('apiCall').and.returnValue(of({ success: true }));

      dialogRefSpy.afterClosed.and.returnValue(of(dialogResult));

      const apiConfig: DialogApiConfig<any, any> = {
        shouldProceed: (result) => !!(result && result.id)
      };

      service.openDialogWithApi(mockComponent, mockApiCall, { apiConfig }).subscribe(result => {
        expect(mockApiCall).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
        done();
      });
    });

    it('should call onSuccess callback after successful API call', (done) => {
      const mockComponent = class MockComponent {};
      const apiResponse = { id: 1, name: 'Test' };
      const mockApiCall = jasmine.createSpy('apiCall').and.returnValue(of(apiResponse));
      const onSuccessSpy = jasmine.createSpy('onSuccess');

      dialogRefSpy.afterClosed.and.returnValue(of({ name: 'Test' }));
      apiHelperSpy.handleApiCall.and.callFake((obs, options) => {
        return obs.pipe(
          (source: any) => new (require('rxjs').Observable)((observer: any) => {
            source.subscribe({
              next: (val: any) => {
                if (options.onSuccess) options.onSuccess(val);
                observer.next(val);
              },
              error: (err: any) => observer.error(err),
              complete: () => observer.complete()
            });
          })
        );
      });

      service.openDialogWithApi(mockComponent, mockApiCall, {
        apiConfig: { onSuccess: onSuccessSpy }
      }).subscribe(() => {
        expect(onSuccessSpy).toHaveBeenCalledWith(apiResponse);
        done();
      });
    });

    it('should call onRefresh callback after onSuccess', (done) => {
      const mockComponent = class MockComponent {};
      const apiResponse = { id: 1, name: 'Test' };
      const mockApiCall = jasmine.createSpy('apiCall').and.returnValue(of(apiResponse));
      const callOrder: string[] = [];

      dialogRefSpy.afterClosed.and.returnValue(of({ name: 'Test' }));
      apiHelperSpy.handleApiCall.and.callFake((obs, options) => {
        return obs.pipe(
          (source: any) => new (require('rxjs').Observable)((observer: any) => {
            source.subscribe({
              next: (val: any) => {
                if (options.onSuccess) {
                  options.onSuccess(val);
                  callOrder.push('onSuccess');
                }
                observer.next(val);
              },
              error: (err: any) => observer.error(err),
              complete: () => observer.complete()
            });
          })
        );
      });

      service.openDialogWithApi(mockComponent, mockApiCall, {
        apiConfig: {
          onSuccess: () => {},
          onRefresh: () => callOrder.push('onRefresh')
        }
      }).subscribe(() => {
        expect(callOrder).toEqual(['onSuccess', 'onRefresh']);
        done();
      });
    });

    it('should pass configuration to apiHelper.handleApiCall', (done) => {
      const mockComponent = class MockComponent {};
      const mockApiCall = jasmine.createSpy('apiCall').and.returnValue(of({}));

      dialogRefSpy.afterClosed.and.returnValue(of({ name: 'Test' }));
      apiHelperSpy.handleApiCall.and.returnValue(of({}));

      const apiConfig: DialogApiConfig<any, any> = {
        successMessage: 'Success!',
        errorMessage: 'Error!',
        silent: true,
        successDuration: 2000,
        errorDuration: 5000
      };

      service.openDialogWithApi(mockComponent, mockApiCall, { apiConfig }).subscribe(() => {
        expect(apiHelperSpy.handleApiCall).toHaveBeenCalledWith(
          jasmine.any(Object),
          jasmine.objectContaining({
            successMessage: 'Success!',
            errorMessage: 'Error!',
            silent: true,
            successDuration: 2000,
            errorDuration: 5000
          })
        );
        done();
      });
    });
  });

  describe('confirm', () => {
    it('should open ConfirmDialogComponent with correct data', () => {
      dialogRefSpy.afterClosed.and.returnValue(of(true));

      const options: ConfirmOptions = {
        title: 'Delete?',
        message: 'Are you sure?',
        confirmButtonText: 'Yes',
        cancelButtonText: 'No'
      };

      service.confirm(options).subscribe();

      expect(dialogSpy.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        jasmine.objectContaining({
          width: '400px',
          data: {
            title: 'Delete?',
            message: 'Are you sure?',
            confirmButtonText: 'Yes',
            cancelButtonText: 'No'
          }
        })
      );
    });

    it('should return true when user confirms', (done) => {
      dialogRefSpy.afterClosed.and.returnValue(of(true));

      service.confirm({ title: 'Confirm', message: 'Sure?' }).subscribe(result => {
        expect(result).toBe(true);
        done();
      });
    });

    it('should return false when user dismisses', (done) => {
      dialogRefSpy.afterClosed.and.returnValue(of(false));

      service.confirm({ title: 'Confirm', message: 'Sure?' }).subscribe(result => {
        expect(result).toBe(false);
        done();
      });
    });

    it('should return false when dialog returns null', (done) => {
      dialogRefSpy.afterClosed.and.returnValue(of(null));

      service.confirm({ title: 'Confirm', message: 'Sure?' }).subscribe(result => {
        expect(result).toBe(false);
        done();
      });
    });

    it('should use custom width if provided', () => {
      dialogRefSpy.afterClosed.and.returnValue(of(true));

      service.confirm({
        title: 'Confirm',
        message: 'Sure?',
        width: '500px'
      }).subscribe();

      expect(dialogSpy.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        jasmine.objectContaining({ width: '500px' })
      );
    });
  });

  describe('confirmDelete', () => {
    it('should generate default German messages', () => {
      dialogRefSpy.afterClosed.and.returnValue(of(false));

      service.confirmDelete(
        { itemName: 'diesen Beitrag' },
        () => of(void 0)
      ).subscribe();

      expect(dialogSpy.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            title: 'diesen Beitrag löschen?',
            message: 'Möchten Sie diesen Beitrag wirklich löschen?',
            confirmButtonText: 'Löschen'
          })
        })
      );
    });

    it('should use custom title and message if provided', () => {
      dialogRefSpy.afterClosed.and.returnValue(of(false));

      service.confirmDelete(
        {
          itemName: 'item',
          title: 'Custom Title',
          message: 'Custom Message',
          confirmButtonText: 'Custom Confirm'
        },
        () => of(void 0)
      ).subscribe();

      expect(dialogSpy.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            title: 'Custom Title',
            message: 'Custom Message',
            confirmButtonText: 'Custom Confirm'
          })
        })
      );
    });

    it('should call delete API when user confirms', (done) => {
      const deleteApiCall = jasmine.createSpy('deleteApiCall').and.returnValue(of(void 0));
      dialogRefSpy.afterClosed.and.returnValue(of(true));
      apiHelperSpy.handleApiCall.and.returnValue(of(void 0));

      service.confirmDelete(
        { itemName: 'item' },
        deleteApiCall
      ).subscribe(() => {
        expect(deleteApiCall).toHaveBeenCalled();
        expect(apiHelperSpy.handleApiCall).toHaveBeenCalled();
        done();
      });
    });

    it('should NOT call delete API when user cancels', (done) => {
      const deleteApiCall = jasmine.createSpy('deleteApiCall').and.returnValue(of(void 0));
      dialogRefSpy.afterClosed.and.returnValue(of(false));

      service.confirmDelete(
        { itemName: 'item' },
        deleteApiCall
      ).subscribe(result => {
        expect(deleteApiCall).not.toHaveBeenCalled();
        expect(apiHelperSpy.handleApiCall).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
        done();
      });
    });

    it('should pass API config options to apiHelper', (done) => {
      dialogRefSpy.afterClosed.and.returnValue(of(true));
      apiHelperSpy.handleApiCall.and.returnValue(of(void 0));

      service.confirmDelete(
        { itemName: 'item' },
        () => of(void 0),
        {
          successMessage: 'Deleted!',
          errorMessage: 'Error!',
          silent: false
        }
      ).subscribe(() => {
        expect(apiHelperSpy.handleApiCall).toHaveBeenCalledWith(
          jasmine.any(Object),
          jasmine.objectContaining({
            successMessage: 'Deleted!',
            errorMessage: 'Error!',
            silent: false
          })
        );
        done();
      });
    });

    it('should call onSuccess and onRefresh callbacks', (done) => {
      const onSuccessSpy = jasmine.createSpy('onSuccess');
      const onRefreshSpy = jasmine.createSpy('onRefresh');

      dialogRefSpy.afterClosed.and.returnValue(of(true));
      apiHelperSpy.handleApiCall.and.callFake((obs, options) => {
        return obs.pipe(
          (source: any) => new (require('rxjs').Observable)((observer: any) => {
            source.subscribe({
              next: (val: any) => {
                if (options.onSuccess) options.onSuccess(val);
                observer.next(val);
              },
              error: (err: any) => observer.error(err),
              complete: () => observer.complete()
            });
          })
        );
      });

      service.confirmDelete(
        { itemName: 'item' },
        () => of(void 0),
        {
          onSuccess: onSuccessSpy,
          onRefresh: onRefreshSpy
        }
      ).subscribe(() => {
        expect(onSuccessSpy).toHaveBeenCalled();
        expect(onRefreshSpy).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('openCreateDialog', () => {
    it('should call openDialogWithApi with correct parameters', (done) => {
      const mockComponent = class MockComponent {};
      const formData = { name: 'Test' };
      const apiResponse = { id: 1, name: 'Test' };
      const createApiCall = jasmine.createSpy('createApiCall').and.returnValue(of(apiResponse));

      dialogRefSpy.afterClosed.and.returnValue(of(formData));
      apiHelperSpy.handleApiCall.and.returnValue(of(apiResponse));

      service.openCreateDialog(
        mockComponent,
        createApiCall,
        { successMessage: 'Created!' }
      ).subscribe(result => {
        expect(createApiCall).toHaveBeenCalledWith(formData);
        expect(result).toEqual(apiResponse);
        done();
      });
    });

    it('should accept dialogConfig parameter', () => {
      const mockComponent = class MockComponent {};
      dialogRefSpy.afterClosed.and.returnValue(of(null));

      service.openCreateDialog(
        mockComponent,
        () => of({}),
        {},
        { width: '800px', disableClose: true }
      ).subscribe();

      expect(dialogSpy.open).toHaveBeenCalledWith(
        mockComponent,
        jasmine.objectContaining({
          width: '800px',
          disableClose: true
        })
      );
    });
  });

  describe('openEditDialog', () => {
    it('should pass dialogData to dialog', () => {
      const mockComponent = class MockComponent {};
      const dialogData = { id: 1, name: 'Test' };
      dialogRefSpy.afterClosed.and.returnValue(of(null));

      service.openEditDialog(
        mockComponent,
        () => of({}),
        dialogData
      ).subscribe();

      expect(dialogSpy.open).toHaveBeenCalledWith(
        mockComponent,
        jasmine.objectContaining({
          data: dialogData
        })
      );
    });

    it('should call updateApiCall with form data', (done) => {
      const mockComponent = class MockComponent {};
      const dialogData = { id: 1, name: 'Original' };
      const formData = { id: 1, name: 'Updated' };
      const apiResponse = { id: 1, name: 'Updated' };
      const updateApiCall = jasmine.createSpy('updateApiCall').and.returnValue(of(apiResponse));

      dialogRefSpy.afterClosed.and.returnValue(of(formData));
      apiHelperSpy.handleApiCall.and.returnValue(of(apiResponse));

      service.openEditDialog(
        mockComponent,
        updateApiCall,
        dialogData,
        { successMessage: 'Updated!' }
      ).subscribe(result => {
        expect(updateApiCall).toHaveBeenCalledWith(formData);
        expect(result).toEqual(apiResponse);
        done();
      });
    });

    it('should merge dialogConfigOverrides with data', () => {
      const mockComponent = class MockComponent {};
      const dialogData = { id: 1 };
      dialogRefSpy.afterClosed.and.returnValue(of(null));

      service.openEditDialog(
        mockComponent,
        () => of({}),
        dialogData,
        {},
        { width: '700px', disableClose: true }
      ).subscribe();

      expect(dialogSpy.open).toHaveBeenCalledWith(
        mockComponent,
        jasmine.objectContaining({
          width: '700px',
          disableClose: true,
          data: dialogData
        })
      );
    });
  });
});
