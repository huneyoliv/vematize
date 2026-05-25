import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { THROTTLER_OPTIONS } from '@nestjs/throttler/dist/throttler.constants';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  constructor(
    @Inject(THROTTLER_OPTIONS) options: ThrottlerModuleOptions,
    @Inject(ThrottlerStorage) storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (!this.isEnabled(this.config.get('RATE_LIMIT_ENABLED', 'true'))) {
      return true;
    }
    return super.shouldSkip(context);
  }

  private isEnabled(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (value === undefined || value === null) return true;
    return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
  }
}
