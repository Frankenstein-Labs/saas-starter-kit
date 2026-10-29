import { ApiError } from '../errors';

export enum IntegrationStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  UNVERIFIED = 'UNVERIFIED',
}

export interface TransportRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface Transport {
  fetch<T = any>(url: string, options?: TransportRequestOptions): Promise<T>;
}

export class DefaultHttpTransport implements Transport {
  async fetch<T = any>(
    url: string,
    options: TransportRequestOptions = {}
  ): Promise<T> {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.message) errorMessage = parsed.message;
      } catch {
        // ignore JSON parse error for error text
      }
      throw new ApiError(response.status, errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    return (await response.text()) as unknown as T;
  }
}

export interface ProviderConfig {
  teamId: string;
  provider: string;
  transport?: Transport;
}

export abstract class BaseIntegrationProvider {
  protected teamId: string;
  protected provider: string;
  protected transport: Transport;

  constructor(config: ProviderConfig) {
    this.teamId = config.teamId;
    this.provider = config.provider;
    this.transport = config.transport || new DefaultHttpTransport();
  }

  abstract getStatus(): Promise<IntegrationStatus>;
  abstract connect(credentials: Record<string, any>): Promise<void>;
  abstract disconnect(): Promise<void>;
}
