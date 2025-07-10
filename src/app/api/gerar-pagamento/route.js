import axios from 'axios';

const ASAAS_API = 'https://api-sandbox.asaas.com/v3/payments';
const ASAAS_TOKEN = "$" + process.env.ASAAS_TOKEN;
const headers = {
    'access_token': ASAAS_TOKEN,
    'content-type': 'application/json',
    'Accept': 'application/json',
};
export async function POST(req) {
    try {
        const body = await req.json();
        const { customerId } = body;
        

        if (!customerId) {
            return Response.json({ error: 'ID do cliente não informado.' }, { status: 400 });
        }

        const response = await axios.post(
            ASAAS_API,
            {
                customer: customerId,
                billingType: 'PIX',
                value: 29.9,
                dueDate: new Date().toISOString().split('T')[0],
                description : "Pagamento de acesso ao aplicativo Oráculo - Plano I"
            },
            {
                headers: headers,
            }
        );

        //console.log("Pagamento gerado com sucesso: ", response.data);
        
        return Response.json({
            paymentId: response.data.id,
            invoiceNumber: response.data.invoiceNumber,
            qrCodeImage: response.data.paymentLink,
            payload: response.data.invoiceUrl,
        });
    } catch (error) {
        console.error('Erro ao gerar pagamento:', error?.response?.data || error.message);
        return Response.json({ error: 'Erro ao gerar pagamento' }, { status: 500 });
    }
}
