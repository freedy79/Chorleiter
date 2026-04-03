import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  Form,
  FormField,
  FormCreatePayload,
  FormSubmission,
  FormSubmitPayload,
  FormFieldStatistic,
} from '../models/form';

@Injectable({ providedIn: 'root' })
export class FormService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Form CRUD ──────────────────────────────────────────────

  getForms(): Observable<Form[]> {
    return this.http.get<Form[]>(`${this.apiUrl}/forms`);
  }

  getActiveForms(): Observable<Form[]> {
    return this.http.get<Form[]>(`${this.apiUrl}/forms/active`);
  }

  getFormById(id: number): Observable<Form> {
    return this.http.get<Form>(`${this.apiUrl}/forms/${id}`);
  }

  createForm(data: FormCreatePayload): Observable<Form> {
    return this.http.post<Form>(`${this.apiUrl}/forms`, data);
  }

  updateForm(id: number, data: Partial<FormCreatePayload>): Observable<Form> {
    return this.http.put<Form>(`${this.apiUrl}/forms/${id}`, data);
  }

  deleteForm(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/forms/${id}`);
  }

  duplicateForm(id: number): Observable<Form> {
    return this.http.post<Form>(`${this.apiUrl}/forms/${id}/duplicate`, {});
  }

  // ── Field CRUD ─────────────────────────────────────────────

  addField(formId: number, field: Omit<FormField, 'id' | 'formId'>): Observable<FormField> {
    return this.http.post<FormField>(`${this.apiUrl}/forms/${formId}/fields`, field);
  }

  updateField(formId: number, fieldId: number, data: Partial<FormField>): Observable<FormField> {
    return this.http.put<FormField>(`${this.apiUrl}/forms/${formId}/fields/${fieldId}`, data);
  }

  deleteField(formId: number, fieldId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/forms/${formId}/fields/${fieldId}`);
  }

  reorderFields(formId: number, fieldIds: number[]): Observable<FormField[]> {
    return this.http.put<FormField[]>(`${this.apiUrl}/forms/${formId}/fields/reorder`, { fieldIds });
  }

  // ── Submissions ────────────────────────────────────────────

  submitForm(formId: number, data: FormSubmitPayload): Observable<FormSubmission> {
    return this.http.post<FormSubmission>(`${this.apiUrl}/forms/${formId}/submit`, data);
  }

  getSubmissions(formId: number): Observable<FormSubmission[]> {
    return this.http.get<FormSubmission[]>(`${this.apiUrl}/forms/${formId}/submissions`);
  }

  deleteSubmission(formId: number, submissionId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/forms/${formId}/submissions/${submissionId}`);
  }

  exportSubmissions(formId: number): void {
    // Trigger direct download via window
    window.open(`${this.apiUrl}/forms/${formId}/export`, '_blank');
  }

  getStatistics(formId: number): Observable<{ formTitle: string; submissionCount: number; fields: FormFieldStatistic[] }> {
    return this.http.get<{ formTitle: string; submissionCount: number; fields: FormFieldStatistic[] }>(
      `${this.apiUrl}/forms/${formId}/statistics`
    );
  }

  // ── Public (no auth) ──────────────────────────────────────

  getPublicForm(guid: string): Observable<Partial<Form>> {
    return this.http.get<Partial<Form>>(`${this.apiUrl}/public/forms/${guid}`);
  }

  submitPublicForm(guid: string, data: FormSubmitPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/public/forms/${guid}/submit`, data);
  }
}
