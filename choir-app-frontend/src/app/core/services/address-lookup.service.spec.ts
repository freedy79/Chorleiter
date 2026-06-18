import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AddressLookupService } from './address-lookup.service';

describe('AddressLookupService', () => {
  let service: AddressLookupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AddressLookupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should resolve city by postal code', (done) => {
    service.resolveCityByPostalCode('10115').subscribe(result => {
      expect(result).toBe('Berlin');
      done();
    });

    const req = httpMock.expectOne('https://api.zippopotam.us/de/10115');
    expect(req.request.method).toBe('GET');
    req.flush({ places: [{ 'place name': 'Berlin' }] });
  });

  it('should map first street suggestion from nominatim', (done) => {
    service.suggestAddressByStreet('Musterstraße 1', '10115', 'Berlin').subscribe(result => {
      expect(result).toEqual({
        street: 'Musterstraße',
        houseNumber: '1',
        postalCode: '10115',
        city: 'Berlin',
        country: 'Deutschland',
        displayName: 'Musterstraße 1, 10115 Berlin, Deutschland',
      });
      done();
    });

    const req = httpMock.expectOne(r => {
      const q = r.params.get('q') || '';
      const postalCode = r.params.get('postalcode');
      const city = r.params.get('city');
      return (
        r.url === 'https://nominatim.openstreetmap.org/search'
        && q.includes('Musterstraße 1')
        && postalCode === '10115'
        && city === 'Berlin'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush([
      {
        display_name: 'Musterstraße 1, 10115 Berlin, Deutschland',
        address: {
          road: 'Musterstraße',
          house_number: '1',
          postcode: '10115',
          city: 'Berlin',
          country: 'Deutschland',
        },
      },
    ]);
  });
});
