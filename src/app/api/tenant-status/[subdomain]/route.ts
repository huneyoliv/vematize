import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('vematize');
    const tenantsCollection = db.collection('tenants');

    // Busca por username OU subdomain (banco usa username como identificador principal)
    const tenant = await tenantsCollection.findOne(
      { $or: [{ username: subdomain }, { subdomain }] },
      { projection: { subscriptionStatus: 1, trialEndsAt: 1, planId: 1 } }
    );

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Determina status baseado em subscription e trial
    let status = 'active';
    
    if (tenant.subscriptionStatus === 'inactive') {
      status = 'inactive';
    } else if (tenant.subscriptionStatus === 'trial') {
      const trialEndsAt = new Date(tenant.trialEndsAt);
      if (trialEndsAt < new Date()) {
        status = 'inactive'; // Trial expirado
      }
    }

    return NextResponse.json({
      status,
      subscriptionStatus: tenant.subscriptionStatus,
      trialEndsAt: tenant.trialEndsAt,
      planId: tenant.planId,
    });

  } catch (error) {
    console.error('[API] Error fetching tenant status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
