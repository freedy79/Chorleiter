import { of } from 'rxjs';
import { SendPlanDialogComponent } from './send-plan-dialog.component';
import { SaveAddressBookPromptDialogComponent } from './save-address-book-prompt-dialog.component';


describe('SendPlanDialogComponent', () => {
  function createComponent(overrides: Partial<{
    addressBook: any;
    monthlyPlan: any;
    dialog: any;
    dialogRef: any;
  }> = {}) {
    const dialogRef = overrides.dialogRef || { close: jasmine.createSpy('close') };
    const addressBook = overrides.addressBook || {
      list: jasmine.createSpy('list').and.returnValue(of([{ id: 10, name: 'Privat', firstName: 'Paula', email: 'paula@example.com' }])),
      checkEmails: jasmine.createSpy('checkEmails').and.returnValue(of({ knownUserEmails: [], knownPersonalEmails: [], newEmails: [], invalidEmails: [] })),
      createBulk: jasmine.createSpy('createBulk').and.returnValue(of([]))
    };
    const monthlyPlan = overrides.monthlyPlan || {
      getEmailRecipientPreference: jasmine.createSpy('getEmailRecipientPreference').and.returnValue(of({ selectedUserIds: [1], selectedAddressBookEntryIds: [10] }))
    };
    const dialog = overrides.dialog || { open: jasmine.createSpy('open') };
    const notification = { error: jasmine.createSpy('error') };

    const component = new SendPlanDialogComponent(
      dialogRef as any,
      { members: [{ id: 1, name: 'Beck', firstName: 'Holger', email: 'holger@example.com' }] as any },
      addressBook,
      monthlyPlan,
      dialog as any,
      notification as any
    );

    return { component, dialogRef, addressBook, monthlyPlan, dialog, notification };
  }

  it('should preselect saved user and personal address book recipients', () => {
    const { component } = createComponent();

    component.ngOnInit();

    expect(component.loading).toBeFalse();
    expect(component.selectedUsers.has(1)).toBeTrue();
    expect(component.selectedPersonalEntries.has(10)).toBeTrue();
    expect(component.options.length).toBe(2);
  });

  it('should parse comma, semicolon and whitespace separated emails', () => {
    const { component } = createComponent();
    component.emails = ' A@example.com, b@example.com; c@example.com  d@example.com ';

    expect(component.parseEmails()).toEqual(['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com']);
  });

  it('should save new external emails before closing the send result', () => {
    const dialogRef = { close: jasmine.createSpy('close') };
    const addressBook = {
      list: jasmine.createSpy('list').and.returnValue(of([])),
      checkEmails: jasmine.createSpy('checkEmails').and.returnValue(of({
        knownUserEmails: [],
        knownPersonalEmails: [],
        newEmails: ['new@example.com'],
        invalidEmails: []
      })),
      createBulk: jasmine.createSpy('createBulk').and.returnValue(of([{ id: 77, email: 'new@example.com', name: '', firstName: '' }]))
    };
    const dialog = {
      open: jasmine.createSpy('open').and.callFake((component: any) => {
        expect(component).toBe(SaveAddressBookPromptDialogComponent);
        return { afterClosed: () => of('save') };
      })
    };
    const { component } = createComponent({
      dialogRef,
      addressBook,
      dialog,
      monthlyPlan: { getEmailRecipientPreference: jasmine.createSpy('getEmailRecipientPreference').and.returnValue(of({ selectedUserIds: [], selectedAddressBookEntryIds: [] })) }
    });

    component.ngOnInit();
    component.emails = 'new@example.com';
    component.send();

    expect(addressBook.createBulk).toHaveBeenCalledWith(['new@example.com']);
    expect(dialogRef.close).toHaveBeenCalledWith({
      ids: [],
      addressBookEntryIds: [77],
      emails: [],
      saveSelection: true
    });
  });
});
