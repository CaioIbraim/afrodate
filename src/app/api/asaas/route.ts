// app/api/asaas/route.ts

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Definindo tipos para melhor tipagem
interface RequestBody {
  valor: number;
  descricao?: string;
  customerId: string; // Você pode passar isso pelo body ou buscar do backend
}

interface AsaasPixResponse {
  id: string;
  payload: string;
  qrCodeUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    const { valor, descricao = 'Pagamento via Pix', customerId } = body;

    if (!valor || !customerId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: valor e customerId' },
        { status: 400 }
      );
    }

    // Fazendo requisição para a API da ASAAS
    const asaasResponse = await axios.post<AsaasPixResponse>(
      'https://api.asaas.com/v3/pix/qrCodesStatic ',
      {
        value: parseFloat(valor.toFixed(2)),
        description: descricao,
        customerId,
      },
      {
        headers: {
          access_token: process.env.ASAAS_TOKEN!,
          'Content-Type': 'application/json',
        },
      }
    );

    // Retornando resposta ao frontend
    return NextResponse.json(asaasResponse.data, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao gerar cobrança Pix:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Erro ao gerar cobrança Pix', details: error.message },
      { status: 500 }
    );
  }
}