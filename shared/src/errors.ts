export type ErrorFamily =
  | "validation_error"
  | "policy_refusal"
  | "payment_failure"
  | "dispatch_rejection"
  | "dispatch_ambiguity"
  | "provider_outage"
  | "tracking_unavailable"
  | "file_upload_failure"
  | "rendering_failure"
  | "retention_cleanup_failure";

export interface ApiErrorField {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    family: ErrorFamily;
    message: string;
    userMessage: string;
    userAction: string | null;
    fields?: ApiErrorField[];
    requestId?: string;
  };
}
