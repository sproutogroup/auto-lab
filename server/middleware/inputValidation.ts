import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { logger } from "../logger";

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class InputValidator {
  private static xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+=/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
  ];

  private static sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\b.*\d+\s*=\s*\d+)/gi,
    /('.*OR.*'|".*OR.*")/gi,
    /(;|\|\||&&)/gi,
  ];

  static sanitizeString(input: string): string {
    if (typeof input !== "string") return "";

    // Remove XSS patterns
    let sanitized = input;
    this.xssPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "");
    });

    // Remove SQL injection patterns
    this.sqlInjectionPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "");
    });

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

    return sanitized.trim();
  }

  static validateEmail(email: string): boolean {
    const emailSchema = z.string().email();
    return emailSchema.safeParse(email).success;
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/);
    return phoneSchema.safeParse(phone).success;
  }

  static validateCurrency(amount: string | number): boolean {
    const numericAmount =
      typeof amount === "string" ? parseFloat(amount) : amount;
    return (
      !isNaN(numericAmount) && numericAmount >= 0 && numericAmount < 999999999
    );
  }

  static validateDate(date: string): boolean {
    const dateObj = new Date(date);
    return (
      !isNaN(dateObj.getTime()) &&
      dateObj > new Date("1900-01-01") &&
      dateObj < new Date("2100-01-01")
    );
  }

  static validateId(id: string | number): boolean {
    const numericId = typeof id === "string" ? parseInt(id, 10) : id;
    return !isNaN(numericId) && numericId > 0 && numericId <= 2147483647;
  }

  static createValidationMiddleware(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitize string inputs
        const sanitizedBody = this.sanitizeObject(req.body);
        const sanitizedQuery = this.sanitizeObject(req.query);
        const sanitizedParams = this.sanitizeObject(req.params);

        // Validate against schema
        const validationResult = schema.safeParse({
          body: sanitizedBody,
          query: sanitizedQuery,
          params: sanitizedParams,
        });

        if (!validationResult.success) {
          const errors: ValidationError[] = validationResult.error.errors.map(
            (err) => ({
              field: err.path.join("."),
              message: err.message,
              value: err.code === "invalid_type" ? undefined : err.message,
            }),
          );

          logger.warn("Input validation failed", {
            errors,
            url: req.url,
            method: req.method,
            ip: req.ip,
          });

          return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors,
          });
        }

        // Update request objects with sanitized data
        req.body = sanitizedBody;
        req.query = sanitizedQuery;
        req.params = sanitizedParams;

        next();
      } catch (error) {
        logger.error("Validation middleware error", { error, url: req.url });
        return res.status(500).json({
          success: false,
          message: "Internal validation error",
        });
      }
    };
  }

  private static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === "string") {
      return this.sanitizeString(obj);
    }

    if (typeof obj === "number" || typeof obj === "boolean") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === "object") {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }
}

// Common validation schemas
export const commonSchemas = {
  user: z.object({
    body: z.object({
      username: z.string().min(3).max(50),
      email: z.string().email().optional(),
      first_name: z.string().min(1).max(100).optional(),
      last_name: z.string().min(1).max(100).optional(),
    }),
  }),

  vehicle: z.object({
    body: z.object({
      make: z.string().min(1).max(100),
      model: z.string().min(1).max(100),
      year: z.number().min(1900).max(2100),
      price: z.number().min(0).max(999999999),
      stock_number: z.string().min(1).max(50),
      registration: z.string().min(1).max(20).optional(),
    }),
  }),

  customer: z.object({
    body: z.object({
      first_name: z.string().min(1).max(100),
      last_name: z.string().min(1).max(100),
      email: z.string().email().optional(),
      phone: z
        .string()
        .regex(/^\+?[\d\s\-\(\)]+$/)
        .optional(),
      address: z.string().max(500).optional(),
    }),
  }),

  pagination: z.object({
    query: z.object({
      page: z.string().regex(/^\d+$/).optional(),
      limit: z.string().regex(/^\d+$/).optional(),
      search: z.string().max(100).optional(),
    }),
  }),
};

export const validateInput = InputValidator.createValidationMiddleware;
