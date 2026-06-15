import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PersonalAddressBookService } from './personal-address-book.service';
import { environment } from 'src/environments/environment';
import { PersonalAddressBookEntry } from '../models/personal-address-book-entry';


describe('PersonalAddressBookService', () => {
  let service: PersonalAddressBookService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/personal-address-book`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(PersonalAddressBookService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should list personal address book entries', () => {
    const entries: PersonalAddressBookEntry[] = [{ id: 1, name: 'Extern', firstName: 'Eva', email: 'eva@example.com' }];
    let result: PersonalAddressBookEntry[] | undefined;

    service.list().subscribe(value => result = value);

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(entries);

    expect(result).toEqual(entries);
  });

  it('should check entered emails', () => {
    let result: any;

    service.checkEmails(['new@example.com']).subscribe(value => result = value);

    const req = httpMock.expectOne(`${apiUrl}/check`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ emails: ['new@example.com'] });
    req.flush({ knownUserEmails: [], knownPersonalEmails: [], newEmails: ['new@example.com'], invalidEmails: [] });

    expect(result.newEmails).toEqual(['new@example.com']);
  });

  it('should create multiple address book entries', () => {
    service.createBulk(['a@example.com', 'b@example.com']).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/bulk`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ emails: ['a@example.com', 'b@example.com'] });
    req.flush([]);
  });
});
