import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

interface ZippopotamPlace {
  'place name'?: string;
}

interface ZippopotamResponse {
  places?: ZippopotamPlace[];
}

interface NominatimAddress {
  road?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  country?: string;
}

interface NominatimResult {
  display_name?: string;
  address?: NominatimAddress;
}

export interface AddressSuggestion {
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class AddressLookupService {
  constructor(private http: HttpClient) {}

  resolveCityByPostalCode(postalCode: string, countryCode = 'de'): Observable<string | null> {
    const normalized = String(postalCode || '').trim();
    if (!/^\d{4,6}$/.test(normalized)) {
      return of(null);
    }

    const url = `https://api.zippopotam.us/${countryCode.toLowerCase()}/${encodeURIComponent(normalized)}`;
    return this.http.get<ZippopotamResponse>(url).pipe(
      map(response => response?.places?.[0]?.['place name']?.trim() || null),
      catchError(() => of(null)),
    );
  }

  suggestAddressByStreet(streetInput: string, postalCode?: string, city?: string, countryCode = 'de'): Observable<AddressSuggestion | null> {
    const query = String(streetInput || '').trim();
    if (query.length < 4) {
      return of(null);
    }

    let params = new HttpParams()
      .set('format', 'jsonv2')
      .set('addressdetails', '1')
      .set('limit', '1')
      .set('countrycodes', countryCode.toLowerCase())
      .set('accept-language', 'de')
      .set('q', [query, postalCode || '', city || ''].filter(Boolean).join(', '));

    if (postalCode) {
      params = params.set('postalcode', postalCode.trim());
    }
    if (city) {
      params = params.set('city', city.trim());
    }

    return this.http.get<NominatimResult[]>('https://nominatim.openstreetmap.org/search', { params }).pipe(
      map((results) => {
        const first = results?.[0];
        if (!first) {
          return null;
        }

        const road = first.address?.road?.trim() || '';
        const houseNumber = first.address?.house_number?.trim() || '';
        return {
          street: road || undefined,
          houseNumber: houseNumber || undefined,
          postalCode: first.address?.postcode?.trim(),
          city: first.address?.city?.trim()
            || first.address?.town?.trim()
            || first.address?.village?.trim()
            || first.address?.municipality?.trim(),
          country: first.address?.country?.trim(),
          displayName: first.display_name?.trim() || [[road, houseNumber].filter(Boolean).join(' '), first.address?.postcode, first.address?.city].filter(Boolean).join(', '),
        };
      }),
      catchError(() => of(null)),
    );
  }
}
