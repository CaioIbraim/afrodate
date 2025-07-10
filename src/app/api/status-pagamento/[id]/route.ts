

import { NextRequest } from 'next/server';
import axios from 'axios';

const ASAAS_TOKEN = "$"+process.env.ASAAS_TOKEN;
const headers = {
  'access_token': ASAAS_TOKEN,
  'content-type': 'application/json',
  'Accept': 'application/json',
};
// Função GET para buscar feirantes com base no slug
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Recuperando o slug passado na URL
  
  
  if (!id) {
    return Response.json({ error: 'ID do pagamento é obrigatório.' }, { status: 400 });
  }

  try {
    const response = await axios.get(
      `https://api-sandbox.asaas.com/v3/payments/${id}`,
      {
        headers: headers
      }
    );

    return Response.json({ status: response.data.status });
  } catch (error: any) {
    console.error('Erro ao consultar status do pagamento:', error?.response?.data || error.message);
    return Response.json({ error: 'Erro ao verificar status do pagamento' }, { status: 500 });
  }


  // Retorna a resposta com os dados encontrados
  return new Response(JSON.stringify({ id }), {
    status: 200,
  });
}