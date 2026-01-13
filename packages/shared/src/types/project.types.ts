export type ExternalServiceType = 'qualtrics' | 'google-forms' | 'custom' | 'other';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  projectToken: string;
  userIdKey: string;
  externalServiceType?: ExternalServiceType | null;
  externalServiceUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectCreateInput {
  name: string;
  description?: string;
  userIdKey?: string;
  externalServiceType?: ExternalServiceType;
  externalServiceUrl?: string;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  userIdKey?: string;
  externalServiceType?: ExternalServiceType;
  externalServiceUrl?: string;
  isActive?: boolean;
}

export interface ProjectWithSnippets extends Project {
  trackingSnippet: string;
  iframeSnippet: string;
}
