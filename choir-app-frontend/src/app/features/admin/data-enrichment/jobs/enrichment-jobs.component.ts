import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '@modules/material.module';
import { AdminService } from '@core/services/admin.service';
import { NotificationService } from '@core/services/notification.service';

interface EnrichmentJobResponse {
  jobId: string;
  status: string;
  message: string;
}

@Component({
  selector: 'app-enrichment-jobs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './enrichment-jobs.component.html',
  styleUrls: ['./enrichment-jobs.component.scss']
})
export class EnrichmentJobsComponent {
  jobForm: FormGroup;
  lookupForm: FormGroup;

  creating = false;
  loadingJob = false;

  createdJob: EnrichmentJobResponse | null = null;
  jobDetails: any = null;

  fieldOptions = [
    { value: 'opus', label: 'Opus' },
    { value: 'voicing', label: 'Besetzung' },
    { value: 'key', label: 'Tonart' },
    { value: 'durationSec', label: 'Dauer (Sek.)' }
  ];

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private notification: NotificationService
  ) {
    this.jobForm = this.fb.group({
      jobType: ['piece', Validators.required],
      fields: [["opus", "voicing", "key", "durationSec"], Validators.required],
      autoApprove: [false],
      autoApproveThreshold: [0.95]
    });

    this.lookupForm = this.fb.group({
      jobId: ['', Validators.required]
    });
  }

  createJob(): void {
    if (this.jobForm.invalid) {
      this.jobForm.markAllAsTouched();
      return;
    }

    const values = this.jobForm.value;

    this.creating = true;
    this.createdJob = null;

    this.adminService.createEnrichmentJob(values.jobType, values.fields, {
      autoApprove: values.autoApprove,
      autoApproveThreshold: values.autoApproveThreshold
    }).subscribe({
      next: (response) => {
        this.creating = false;
        this.createdJob = response.job;
        this.notification.success('Enrichment-Job gestartet', 3000);
      },
      error: (err) => {
        console.error('Error creating job:', err);
        this.creating = false;
        this.notification.error(err.error?.message || 'Job konnte nicht gestartet werden.');
      }
    });
  }

  loadJob(): void {
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      return;
    }

    const { jobId } = this.lookupForm.value;

    this.loadingJob = true;
    this.jobDetails = null;

    this.adminService.getEnrichmentJob(jobId).subscribe({
      next: (response) => {
        this.jobDetails = response.job;
        this.loadingJob = false;
      },
      error: (err) => {
        console.error('Error loading job:', err);
        this.loadingJob = false;
        this.notification.error('Job konnte nicht geladen werden.');
      }
    });
  }
}
