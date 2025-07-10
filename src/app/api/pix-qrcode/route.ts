import axios from 'axios';

const ASAAS_TOKEN = "$"+process.env.ASAAS_TOKEN;
const headers = {
    'access_token': ASAAS_TOKEN,
    'content-type': 'application/json',
    'Accept': 'application/json',
};
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get('id');

  if (!paymentId) {
    return Response.json({ error: 'ID do pagamento não fornecido.' }, { status: 400 });
  }

  try {
    const { data } = await axios.get(
      `https://api-sandbox.asaas.com/v3/payments/${paymentId}/pixQrCode`,
      {
        headers: headers
      }
    );

    return Response.json({
      qrCodeImage: data.encodedImage,
      payload: data.payload,
      expirationDate: data.expirationDate,
    });
  } catch (err: any) {
    console.error('Erro ao buscar QR Code:', err?.response?.data || err.message);
    return Response.json({ error: 'Erro ao buscar QR Code' }, { status: 500 });
  }
}
