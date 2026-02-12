/**
 * Google Drive Integration Service
 *
 * Provides functionality to fetch email templates from Google Drive
 */

import { google } from "googleapis";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export interface EmailTemplate {
  id: string;
  name: string;
  content: string;
  type: "partnership" | "collaboration" | "funding" | "custom";
  category?: string;
}

export class GoogleDriveService {
  private drive: any;
  private logger: (msg: string, level?: "info" | "warn" | "error") => void;

  constructor(
    logger: (msg: string, level?: "info" | "warn" | "error") => void,
  ) {
    this.logger = logger;
  }

  async initialize(): Promise<boolean> {
    try {
      this.logger(
        "[GoogleDriveService] Initializing Google Drive connection...",
      );

      // Check for required environment variables
      const apiKey = process.env.GOOGLE_API_KEY;
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY;

      if (!apiKey && !clientEmail) {
        this.logger(
          "[GoogleDriveService] Missing GOOGLE_API_KEY or GOOGLE_CLIENT_EMAIL in environment",
          "error",
        );
        this.logger("[GoogleDriveService] Available env vars:", "info");
        this.logger(`GOOGLE_API_KEY: ${!!apiKey}`);
        this.logger(`GOOGLE_DRIVE_FOLDER_ID: ${!!folderId}`);
        this.logger(`GOOGLE_CLIENT_EMAIL: ${!!clientEmail}`);
        this.logger(`GOOGLE_PRIVATE_KEY: ${!!privateKey}`);
        return false;
      }

      if (!folderId) {
        this.logger(
          "[GoogleDriveService] Missing GOOGLE_DRIVE_FOLDER_ID in environment",
          "error",
        );
        return false;
      }

      // Try OAuth2 service account first, then API key as fallback
      if (clientEmail && privateKey) {
        this.logger(
          "[GoogleDriveService] Using OAuth2 service account authentication",
        );
        const { JWT } = google.auth;
        const auth = new JWT({
          email: clientEmail,
          key: privateKey,
          scopes: ["https://www.googleapis.com/auth/drive.readonly"],
          subject: undefined, // For service account auth
        });
        this.drive = google.drive({
          version: "v3",
          auth: auth,
        });
      } else if (apiKey) {
        this.logger(
          "[GoogleDriveService] Using API key authentication (fallback)",
        );
        this.drive = google.drive({
          version: "v3",
          auth: apiKey,
        });
      } else {
        this.logger(
          "[GoogleDriveService] No valid authentication method available",
          "error",
        );
        return false;
      }

      this.logger(
        `[GoogleDriveService] Initialized with folder ID: ${folderId}`,
      );
      return true;
    } catch (error) {
      this.logger(
        `[GoogleDriveService] Initialization failed: ${(error as Error).message}`,
        "error",
      );
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      this.logger("[GoogleDriveService] Testing connection...");
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      this.logger(
        `[GoogleDriveService] Attempting to access folder: ${folderId}`,
      );

      // Test by trying to access the specified folder
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: "id,name,webViewLink,permissions",
        supportsAllDrives: true,
      });

      if (response.data) {
        this.logger(
          `[GoogleDriveService] Successfully connected to folder: ${response.data.name}`,
        );
        this.logger(
          `[GoogleDriveService] Folder link: ${response.data.webViewLink}`,
        );
        this.logger(
          `[GoogleDriveService] Permissions: ${JSON.stringify(response.data.permissions)}`,
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger(
        `[GoogleDriveService] Connection test failed: ${(error as Error).message}`,
        "error",
      );
      this.logger(
        `[GoogleDriveService] Error details: ${JSON.stringify(error)}`,
        "error",
      );
      return false;
    }
  }

  async listTemplates(): Promise<EmailTemplate[]> {
    try {
      this.logger("[GoogleDriveService] Fetching email templates...");

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

      // List all files in the specified folder
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: "files(id,name,mimeType,webViewLink,createdTime,modifiedTime)",
        orderBy: "name",
      });

      const templates: EmailTemplate[] = [];

      if (response.data && response.data.files) {
        for (const file of response.data.files) {
          // Only process document files
          if (
            file.mimeType &&
            (file.mimeType.includes("document") ||
              file.mimeType.includes("text"))
          ) {
            const template = await this.getTemplateContent(file.id, file.name);
            if (template) {
              templates.push(template);
            }
          }
        }
      }

      this.logger(
        `[GoogleDriveService] Found ${templates.length} email templates`,
      );
      return templates;
    } catch (error) {
      this.logger(
        `[GoogleDriveService] Failed to list templates: ${(error as Error).message}`,
        "error",
      );
      return [];
    }
  }

  private async getTemplateContent(
    fileId: string,
    fileName: string,
  ): Promise<EmailTemplate | null> {
    try {
      this.logger(`[GoogleDriveService] Fetching content for: ${fileName}`);

      // Export file as plain text
      const response = await this.drive.files.export({
        fileId: fileId,
        mimeType: "text/plain",
      });

      const content = response.data;

      // Determine template type based on filename
      const type = this.determineTemplateType(fileName);

      const template: EmailTemplate = {
        id: fileId,
        name: fileName,
        content: content,
        type: type,
      };

      this.logger(
        `[GoogleDriveService] Loaded template: ${fileName} (${type})`,
      );
      return template;
    } catch (error) {
      this.logger(
        `[GoogleDriveService] Failed to get template content: ${(error as Error).message}`,
        "error",
      );
      return null;
    }
  }

  private determineTemplateType(fileName: string): EmailTemplate["type"] {
    const name = fileName.toLowerCase();

    if (name.includes("partnership") || name.includes("collaboration")) {
      return "partnership";
    } else if (name.includes("funding") || name.includes("proposal")) {
      return "funding";
    } else if (name.includes("custom")) {
      return "custom";
    }

    return "collaboration";
  }

  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    try {
      this.logger(
        `[GoogleDriveService] Fetching specific template: ${templateId}`,
      );

      const response = await this.drive.files.get({
        fileId: templateId,
        fields: "id,name,mimeType",
      });

      if (!response.data) {
        return null;
      }

      return await this.getTemplateContent(
        response.data.id,
        response.data.name,
      );
    } catch (error) {
      this.logger(
        `[GoogleDriveService] Failed to get template: ${(error as Error).message}`,
        "error",
      );
      return null;
    }
  }
}
