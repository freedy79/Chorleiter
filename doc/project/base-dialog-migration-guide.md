# BaseFormDialog Migration Guide

## Overview

The `BaseFormDialog` abstract class eliminates massive code duplication across dialog components by providing standard form initialization, validation, and dialog interaction patterns.

## Benefits

- **40+ lines of boilerplate eliminated** per dialog
- Standardized error handling with `markAllAsTouched()`
- Built-in edit mode detection
- Lifecycle hooks for customization
- Type-safe generic interface
- Consistent dialog behavior across the application

## Quick Start

### 1. Simple Dialog Example

**Before:**
```typescript
@Component({...})
export class CategoryDialogComponent implements OnInit {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CategoryDialogComponent>
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.name);
    }
  }
}
```

**After:**
```typescript
@Component({...})
export class CategoryDialogComponent extends BaseFormDialog<string> implements OnInit {
  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<CategoryDialogComponent>
  ) {
    super(fb, dialogRef);
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required]
    });
  }

  protected override getResult(): string {
    return this.form.value.name;
  }
}
```

### 2. Dialog with Data (Edit Mode)

**Before:**
```typescript
@Component({...})
export class UserDialogComponent implements OnInit {
  form: FormGroup;
  title = 'Benutzer hinzufügen';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: User | null
  ) {
    this.title = data ? 'Benutzer bearbeiten' : 'Benutzer hinzufügen';
    this.form = this.fb.group({
      name: [data?.name || '', Validators.required],
      email: [data?.email || '', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    // Load additional data
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
```

**After:**
```typescript
@Component({...})
export class UserDialogComponent extends BaseFormDialog<User, User | null> implements OnInit {
  title!: string;

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: User | null
  ) {
    super(fb, dialogRef, data);
    this.title = this.getDialogTitle('Benutzer hinzufügen', 'Benutzer bearbeiten');
  }

  override ngOnInit(): void {
    super.ngOnInit();
    // Load additional data
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: [this.data?.name || '', Validators.required],
      email: [this.data?.email || '', [Validators.required, Validators.email]]
    });
  }
}
```

## Generic Type Parameters

```typescript
BaseFormDialog<T, D>
```

- **T**: Type of the result returned when dialog is saved (default: `any`)
- **D**: Type of data passed to the dialog (default: `any`)

### Examples:

```typescript
// Simple string result
extends BaseFormDialog<string>

// Object result, no input data
extends BaseFormDialog<{ name: string; email: string }>

// Object result with input data
extends BaseFormDialog<User, User | null>

// Complex data types
extends BaseFormDialog<FormValue, { role: 'composer' | 'author'; record?: any }>
```

## Key Methods and Hooks

### Required Implementation

#### `buildForm(): FormGroup`
**Must be implemented.** Returns the FormGroup for this dialog.

```typescript
protected buildForm(): FormGroup {
  return this.fb.group({
    name: [this.data?.name || '', Validators.required],
    email: [this.data?.email || '', Validators.email]
  });
}
```

### Optional Overrides

#### `getResult(): T`
Transform form value before returning. Default returns `this.form.value`.

```typescript
protected override getResult(): User {
  const value = { ...this.form.value };

  // Normalize data
  if (Array.isArray(value.roles)) {
    value.roles = Array.from(new Set(value.roles));
  }

  // Remove empty fields
  if (!value.password) {
    delete value.password;
  }

  return value;
}
```

#### `isEditMode(): boolean`
Detect if editing existing record. Default checks for `data?.id`.

```typescript
protected override isEditMode(): boolean {
  return !!this.data?.recordId; // Custom ID field
}
```

#### `onFormBuilt(): void`
Called after form is built. Use for subscriptions or additional initialization.

```typescript
protected override onFormBuilt(): void {
  // Subscribe to form changes
  this.form.get('country')?.valueChanges.subscribe(country => {
    this.loadCities(country);
  });

  // Set up complex validation
  this.setupCustomValidation();
}
```

#### `beforeSubmit(): boolean`
Called before form submission. Return `false` to prevent save.

```typescript
protected override beforeSubmit(): boolean {
  if (this.form.get('email')?.value.includes('test')) {
    alert('Test emails are not allowed');
    return false;
  }
  return true;
}
```

### Provided Methods

#### `getDialogTitle(createTitle: string, editTitle: string): string`
Helper to get context-aware title based on edit mode.

```typescript
this.title = this.getDialogTitle('Neuen Benutzer erstellen', 'Benutzer bearbeiten');
```

#### `onCancel(): void`
Closes dialog without saving. Already implemented, no need to override.

#### `onSave(): void`
Validates and saves form. Already implemented with:
- `beforeSubmit()` hook
- Form validation
- `markAllAsTouched()` on invalid
- Result transformation via `getResult()`

### Properties

- `form: FormGroup` - The reactive form instance
- `data?: D` - Input data passed to dialog
- `dialogRef: MatDialogRef<any>` - Dialog reference
- `fb: FormBuilder` - FormBuilder instance

## Complete Migration Examples

### Example 1: Simple Form Dialog

```typescript
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

@Component({
  selector: 'app-simple-dialog',
  template: `
    <h1 mat-dialog-title>Neue Kategorie</h1>
    <div mat-dialog-content>
      <form [formGroup]="form" id="simple-form">
        <mat-form-field>
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" cdkFocusInitial>
        </mat-form-field>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Abbrechen</button>
      <button mat-flat-button color="primary" form="simple-form"
              type="submit" (click)="onSave()" [disabled]="form.invalid">
        Speichern
      </button>
    </div>
  `
})
export class SimplDialogComponent extends BaseFormDialog<string> implements OnInit {
  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<SimplDialogComponent>
  ) {
    super(fb, dialogRef);
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required]
    });
  }

  protected override getResult(): string {
    return this.form.value.name;
  }
}
```

### Example 2: Complex Dialog with Hooks

```typescript
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BaseFormDialog } from '@shared/dialogs/base-form-dialog';

interface UserFormData {
  firstName: string;
  name: string;
  email: string;
  roles: string[];
}

@Component({
  selector: 'app-user-dialog',
  templateUrl: './user-dialog.component.html'
})
export class UserDialogComponent extends BaseFormDialog<UserFormData, User | null> implements OnInit {
  title!: string;
  districts: District[] = [];

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: User | null,
    private api: ApiService
  ) {
    super(fb, dialogRef, data);
    this.title = this.getDialogTitle('Neuen Benutzer erstellen', 'Benutzer bearbeiten');
  }

  override ngOnInit(): void {
    super.ngOnInit(); // IMPORTANT: Call super.ngOnInit()
    this.api.getDistricts().subscribe(d => this.districts = d);
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      firstName: [this.data?.firstName || '', Validators.required],
      name: [this.data?.name || '', Validators.required],
      email: [this.data?.email || '', [Validators.required, Validators.email]],
      roles: [this.data?.roles || ['user'], Validators.required]
    });
  }

  protected override onFormBuilt(): void {
    // Subscribe to form changes
    this.form.get('email')?.valueChanges.subscribe(email => {
      console.log('Email changed:', email);
    });
  }

  protected override beforeSubmit(): boolean {
    const email = this.form.get('email')?.value;
    if (email?.includes('test')) {
      alert('Test emails are not allowed in production');
      return false;
    }
    return true;
  }

  protected override getResult(): UserFormData {
    const value = { ...this.form.value };

    // Ensure 'user' role is always present
    if (Array.isArray(value.roles) && !value.roles.includes('user')) {
      value.roles.push('user');
    }

    return value;
  }
}
```

### Example 3: Dialog with Complex Dependencies

```typescript
@Component({
  selector: 'app-choir-dialog',
  templateUrl: './choir-dialog.component.html'
})
export class ChoirDialogComponent extends BaseFormDialog<Choir, Choir | null> implements OnInit {
  title!: string;
  members: User[] = [];

  constructor(
    fb: FormBuilder,
    dialogRef: MatDialogRef<ChoirDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: Choir | null,
    private api: ApiService,
    private dialog: MatDialog
  ) {
    super(fb, dialogRef, data);
    this.title = this.getDialogTitle('Chor hinzufügen', 'Chor bearbeiten');
  }

  override ngOnInit(): void {
    super.ngOnInit();
    if (this.data?.id) {
      this.loadMembers();
    }
  }

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: [this.data?.name || '', Validators.required],
      description: [this.data?.description || ''],
      location: [this.data?.location || '']
    });
  }

  private loadMembers(): void {
    this.api.getChoirMembers(this.data!.id).subscribe(m => this.members = m);
  }

  // Additional component-specific methods
  openInviteDialog(): void {
    // Custom logic...
  }
}
```

## Migration Checklist

When migrating an existing dialog:

- [ ] Extend `BaseFormDialog<T, D>` with appropriate type parameters
- [ ] Add `implements OnInit` to component
- [ ] Update constructor:
  - [ ] Change `private fb` to `fb` (no access modifier)
  - [ ] Change `public dialogRef` to `dialogRef`
  - [ ] Remove `@Inject(MAT_DIALOG_DATA) public data` access modifier
  - [ ] Add `super(fb, dialogRef, data)` call
- [ ] Move form creation from constructor to `buildForm()` method
- [ ] Remove manual `ngOnInit()` form initialization (if only building form)
- [ ] If keeping `ngOnInit()`, call `super.ngOnInit()` first
- [ ] Remove `onCancel()` and `onSave()` methods (use base class versions)
- [ ] If custom save logic exists, move to `getResult()` or `beforeSubmit()`
- [ ] Replace manual title logic with `getDialogTitle()` helper
- [ ] Remove `form: FormGroup` declaration (inherited from base)
- [ ] Update imports to include `BaseFormDialog`

## Template Requirements

Templates remain largely unchanged. The standard structure is:

```html
<h1 mat-dialog-title>{{ title }}</h1>

<div mat-dialog-content>
  <form [formGroup]="form" id="my-form" (ngSubmit)="onSave()">
    <!-- Form fields -->
  </form>
</div>

<div mat-dialog-actions align="end">
  <button mat-button (click)="onCancel()">Abbrechen</button>
  <button mat-flat-button color="primary" type="submit"
          form="my-form" [disabled]="form.invalid">
    Speichern
  </button>
</div>
```

## Common Pitfalls

### 1. Forgetting `super.ngOnInit()`

**Wrong:**
```typescript
override ngOnInit(): void {
  // Load data - form not initialized yet!
  this.loadData();
}
```

**Correct:**
```typescript
override ngOnInit(): void {
  super.ngOnInit(); // Initialize form first
  this.loadData();
}
```

### 2. Constructor Access Modifiers

**Wrong:**
```typescript
constructor(
  private fb: FormBuilder, // Wrong - should not be private
  ...
) {
  super(fb, dialogRef, data);
}
```

**Correct:**
```typescript
constructor(
  fb: FormBuilder, // Correct - no modifier
  ...
) {
  super(fb, dialogRef, data);
}
```

### 3. Declaring Form Property

**Wrong:**
```typescript
export class MyDialog extends BaseFormDialog {
  form: FormGroup; // Duplicate declaration!
  ...
}
```

**Correct:**
```typescript
export class MyDialog extends BaseFormDialog {
  // No form declaration needed - inherited from base
}
```

### 4. Not Calling onSave() in Template

**Wrong:**
```html
<button (click)="dialogRef.close(form.value)">Speichern</button>
```

**Correct:**
```html
<button (click)="onSave()">Speichern</button>
```

## Advanced Patterns

### Custom Validation Before Submit

```typescript
protected override beforeSubmit(): boolean {
  // Prevent duplicate names
  if (this.existingNames.includes(this.form.value.name)) {
    this.snackBar.open('Name already exists', 'Close');
    return false;
  }

  // Confirm destructive action
  if (this.isEditMode() && this.hasUnsavedChanges()) {
    return confirm('You have unsaved changes. Continue?');
  }

  return true;
}
```

### Async Data Loading in Form Build

```typescript
protected override onFormBuilt(): void {
  // Form is now initialized, load async data
  this.api.getOptions().subscribe(options => {
    this.options = options;

    // Pre-select first option
    if (!this.data && options.length > 0) {
      this.form.patchValue({ option: options[0].id });
    }
  });
}
```

### Complex Result Transformation

```typescript
protected override getResult(): ProgramItem {
  const formValue = this.form.value;
  const dateStr = formValue.date?.toLocaleDateString('en-CA') || undefined;

  const payload = {
    ...formValue,
    date: dateStr,
    pieceIds: this.selectedPieces.map(p => p.id)
  };

  if (this.isEditMode() && this.data?.id) {
    return { id: this.data.id, ...payload };
  }

  return payload;
}
```

## Remaining Dialogs to Migrate

Based on the codebase analysis, these dialogs should be migrated:

- [ ] `event-dialog.component.ts` - Complex with autocomplete
- [ ] `piece-dialog.component.ts` - Very complex, multi-step form
- [ ] `filter-preset-dialog.component.ts`
- [ ] `plan-entry-dialog.component.ts`
- [ ] `publisher-dialog.component.ts`
- [ ] `post-dialog.component.ts`
- [ ] `library-item-dialog.component.ts`
- [ ] `library-collection-dialog.component.ts`
- [ ] `physical-copy-dialog.component.ts`
- [ ] `digital-license-dialog.component.ts`
- [ ] `program-basics-dialog.component.ts`
- [ ] `program-break-dialog.component.ts`
- [ ] `program-free-piece-dialog.component.ts`
- [ ] `program-piece-dialog.component.ts`
- [ ] `program-speech-dialog.component.ts`

**Priority:** Start with simpler dialogs to gain confidence, then tackle complex ones like `piece-dialog`.

## Summary

The `BaseFormDialog` class provides a robust foundation for all form-based dialogs, eliminating 40+ lines of boilerplate per component while maintaining flexibility for complex use cases through lifecycle hooks and override points.

Key benefits:
- Consistent behavior across all dialogs
- Type-safe interfaces
- Built-in validation handling
- Reduced code duplication
- Easier testing and maintenance
