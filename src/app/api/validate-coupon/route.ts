import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/app/krov/coupons/actions';

export async function POST(request: NextRequest) {
  try {
    const { code, planId } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Código do cupom é obrigatório.' },
        { status: 400 }
      );
    }

    if (!planId) {
      return NextResponse.json(
        { success: false, message: 'ID do plano é obrigatório.' },
        { status: 400 }
      );
    }

    const result = await validateCoupon(code, planId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao validar cupom.' },
      { status: 500 }
    );
  }
}






