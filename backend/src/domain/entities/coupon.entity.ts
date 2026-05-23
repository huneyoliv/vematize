export class Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_days';
  value: number;
  description?: string;
  maxUses?: number;
  currentUses: number;
  limitToOneUsePerUser: boolean;
  expiresAt?: Date;
  isActive: boolean;
  applicableProducts?: string[];
  durationType: 'once' | 'repeating' | 'forever';
  durationMonths?: number;
  createdAt: Date;
  updatedAt?: Date;
}
