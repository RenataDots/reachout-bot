/**
 * Schema Validation Utilities
 * 
 * HARD CONSTRAINT: All AI outputs must be validated against explicit JSON schemas
 * before downstream use. This module provides defensive validation with clear error reporting.
 */

import * as schemas from './schemas';

/**
 * Validation result with detailed error tracking
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  type: 'missing_required' | 'type_mismatch' | 'format_invalid' | 'constraint_violation';
}

/**
 * Validates an AI-generated email against the schema
 * Ensures all required fields are present and correctly formatted
 */
export function validateAIGeneratedEmail(data: unknown): ValidationResult<schemas.AIGeneratedEmail> {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [
        {
          field: 'root',
          message: 'Data must be an object',
          type: 'type_mismatch',
        },
      ],
    };
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  const requiredFields = ['subject', 'body', 'tone', 'targetNGOName', 'personalizationNotes', 'confidence', 'validationErrors'];
  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push({
        field,
        message: `Required field "${field}" is missing`,
        type: 'missing_required',
      });
    }
  }

  // Type validation
  if (typeof obj.subject !== 'string') {
    errors.push({
      field: 'subject',
      message: 'subject must be a string',
      type: 'type_mismatch',
    });
  }

  if (typeof obj.body !== 'string') {
    errors.push({
      field: 'body',
      message: 'body must be a string',
      type: 'type_mismatch',
    });
  }

  if (typeof obj.tone !== 'string' || !['professional', 'friendly', 'formal', 'casual'].includes(obj.tone as string)) {
    errors.push({
      field: 'tone',
      message: 'tone must be one of: professional, friendly, formal, casual',
      type: 'constraint_violation',
    });
  }

  if (typeof obj.targetNGOName !== 'string') {
    errors.push({
      field: 'targetNGOName',
      message: 'targetNGOName must be a string',
      type: 'type_mismatch',
    });
  }

  if (!Array.isArray(obj.personalizationNotes)) {
    errors.push({
      field: 'personalizationNotes',
      message: 'personalizationNotes must be an array of strings',
      type: 'type_mismatch',
    });
  } else {
    for (let i = 0; i < (obj.personalizationNotes as unknown[]).length; i++) {
      if (typeof (obj.personalizationNotes as unknown[])[i] !== 'string') {
        errors.push({
          field: `personalizationNotes[${i}]`,
          message: 'All items must be strings',
          type: 'type_mismatch',
        });
      }
    }
  }

  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) {
    errors.push({
      field: 'confidence',
      message: 'confidence must be a number between 0 and 1',
      type: 'constraint_violation',
    });
  }

  if (!Array.isArray(obj.validationErrors)) {
    errors.push({
      field: 'validationErrors',
      message: 'validationErrors must be an array of strings',
      type: 'type_mismatch',
    });
  } else {
    for (let i = 0; i < (obj.validationErrors as unknown[]).length; i++) {
      if (typeof (obj.validationErrors as unknown[])[i] !== 'string') {
        errors.push({
          field: `validationErrors[${i}]`,
          message: 'All items must be strings',
          type: 'type_mismatch',
        });
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: obj as schemas.AIGeneratedEmail,
    errors: [],
  };
}

/**
 * Validates a draft email against the schema
 */
export function validateDraftEmail(data: unknown): ValidationResult<schemas.DraftEmail> {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [
        {
          field: 'root',
          message: 'Data must be an object',
          type: 'type_mismatch',
        },
      ],
    };
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  const requiredFields = ['id', 'campaignId', 'ngoId', 'status', 'subject', 'body', 'recipientEmail', 'createdAt', 'updatedAt'];
  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push({
        field,
        message: `Required field "${field}" is missing`,
        type: 'missing_required',
      });
    }
  }

  // Validate email format
  if (obj.recipientEmail && typeof obj.recipientEmail === 'string') {
    if (!isValidEmail(obj.recipientEmail)) {
      errors.push({
        field: 'recipientEmail',
        message: 'recipientEmail must be a valid email address',
        type: 'format_invalid',
      });
    }
  }

  // Validate status enum
  if (obj.status && !['draft', 'approved', 'sent', 'failed'].includes(obj.status as string)) {
    errors.push({
      field: 'status',
      message: 'status must be one of: draft, approved, sent, failed',
      type: 'constraint_violation',
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: obj as schemas.DraftEmail,
    errors: [],
  };
}

/**
 * Validates a user approval against the schema
 */
export function validateUserApproval(data: unknown): ValidationResult<schemas.UserApproval> {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [
        {
          field: 'root',
          message: 'Data must be an object',
          type: 'type_mismatch',
        },
      ],
    };
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  const requiredFields = ['id', 'resourceType', 'resourceId', 'approvedBy', 'approvalText', 'approvedAt'];
  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push({
        field,
        message: `Required field "${field}" is missing`,
        type: 'missing_required',
      });
    }
  }

  // Validate resource type enum
  if (obj.resourceType && !['email', 'campaign', 'outreach_batch'].includes(obj.resourceType as string)) {
    errors.push({
      field: 'resourceType',
      message: 'resourceType must be one of: email, campaign, outreach_batch',
      type: 'constraint_violation',
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: obj as schemas.UserApproval,
    errors: [],
  };
}

/**
 * Helper: Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper: Format validation errors for logging
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((err) => `[${err.type}] ${err.field}: ${err.message}`).join('\n');
}
