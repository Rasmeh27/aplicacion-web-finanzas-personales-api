import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket = require('ws');

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient;
  readonly adminClient: SupabaseClient | null;

  constructor(config: ConfigService) {
    const supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');
    this.client = createClient(
      supabaseUrl,
      config.getOrThrow<string>('SUPABASE_PUBLISHABLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        realtime: {
          // `ws` implements the WebSocket contract at runtime; its DOM event
          // typings differ slightly from Supabase's structural type.
          transport: WebSocket as unknown as NonNullable<
            Parameters<typeof createClient>[2]
          >['realtime']['transport'],
        },
      },
    );

    const serviceRoleKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.adminClient = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
          realtime: {
            transport: WebSocket as unknown as NonNullable<
              Parameters<typeof createClient>[2]
            >['realtime']['transport'],
          },
        })
      : null;
  }
}
