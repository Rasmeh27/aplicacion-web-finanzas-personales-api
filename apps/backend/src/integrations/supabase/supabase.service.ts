import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient;
  readonly adminClient: SupabaseClient | null;
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;

  constructor(config: ConfigService) {
    this.supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');
    this.supabaseKey = config.getOrThrow<string>('SUPABASE_PUBLISHABLE_KEY');
    this.client = this.createSessionClient();
    const serviceRoleKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.adminClient = serviceRoleKey
      ? createClient(this.supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null;
  }

  createSessionClient(): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}
