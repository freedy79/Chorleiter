import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  constructor(private api: ApiService) {}

  importLibraryCsv(file: File): Observable<any> {
    return this.api.importLibraryCsv(file);
  }
}
