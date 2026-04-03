export type FormFieldType =
  | 'text_short'
  | 'text_long'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'radio'
  | 'multi_checkbox'
  | 'date'
  | 'time'
  | 'rating'
  | 'email'
  | 'heading'
  | 'separator';

export type FormStatus = 'draft' | 'published' | 'closed';

export interface FormFieldValidationRules {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface FormFieldShowIf {
  fieldId: number;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'is_empty';
  value?: string;
}

export interface FormField {
  id?: number;
  formId?: number;
  type: FormFieldType;
  label: string;
  placeholder?: string | null;
  required: boolean;
  options?: string[] | null;
  sortOrder: number;
  validationRules?: FormFieldValidationRules | null;
  showIf?: FormFieldShowIf | null;
}

export interface Form {
  id: number;
  choirId: number;
  title: string;
  description?: string | null;
  status: FormStatus;
  openDate?: string | null;
  closeDate?: string | null;
  publicGuid?: string | null;
  allowAnonymous: boolean;
  allowMultipleSubmissions: boolean;
  maxSubmissions?: number | null;
  notifyOnSubmission: boolean;
  confirmationText?: string | null;
  createdBy: number;
  creator?: { id: number; firstName: string; lastName: string };
  fields?: FormField[];
  submissionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormAnswer {
  id: number;
  submissionId: number;
  fieldId: number;
  value: string | null;
  field?: { id: number; label: string; type: FormFieldType };
}

export interface FormSubmission {
  id: number;
  formId: number;
  userId?: number | null;
  submitterName?: string | null;
  submitterEmail?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  submitter?: { id: number; firstName: string; lastName: string } | null;
  answers?: FormAnswer[];
}

export interface FormCreatePayload {
  title: string;
  description?: string | null;
  status?: FormStatus;
  openDate?: string | null;
  closeDate?: string | null;
  allowAnonymous?: boolean;
  allowMultipleSubmissions?: boolean;
  maxSubmissions?: number | null;
  notifyOnSubmission?: boolean;
  confirmationText?: string | null;
  fields?: Omit<FormField, 'id' | 'formId'>[];
}

export interface FormSubmitPayload {
  answers: { fieldId: number; value: string | number | boolean | null }[];
  submitterName?: string | null;
  submitterEmail?: string | null;
}

export interface FormFieldStatistic {
  fieldId: number;
  label: string;
  type: FormFieldType;
  values: Record<string, number>;
  total: number;
}
