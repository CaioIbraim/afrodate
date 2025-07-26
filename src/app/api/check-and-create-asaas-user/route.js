import axios from 'axios';

const ASAAS_API_URL = process.env.ASAAS_API_URL;
const ASAAS_TOKEN = "$"+process.env.ASAAS_TOKEN;

const headers = {
    'access_token': ASAAS_TOKEN,
    'content-type': 'application/json',
    'Accept': 'application/json',
};

export async function POST(request) {
    const { name, cpf, email } = await request.json();
    
    try {

        // First, try to find existing customer by CPF
        if (email) {
            const searchResponse = await axios.get(
                `${ASAAS_API_URL}/customers`,
                {
                    params: { email: email },
                    headers
                }
            );

            // If customer exists, return their ID
            if (searchResponse.data.data && searchResponse.data.data.length > 0) {
                const customerId = searchResponse.data.data[0].id;
                return Response.json({ customerId });
            }
        }
        // First, try to find existing customer by CPF
        if (cpf) {
            const searchResponse = await axios.get(
                `${ASAAS_API_URL}/customers`,
                {
                    params: { cpfCnpj: cpf },
                    headers
                }
            );

            // If customer exists, return their ID
            if (searchResponse.data.data && searchResponse.data.data.length > 0) {
                const customerId = searchResponse.data.data[0].id;
                return Response.json({ customerId });
            }
        }

        // If no CPF provided or customer not found, and we have a CPF, create new customer
        if (cpf) {
            const createCustomerResponse = await axios.post(
                `${ASAAS_API_URL}/customers`,
                {
                    name: name,
                    cpfCnpj: cpf,
                    email: email,
                },
                { headers }
            );
            const customerId = createCustomerResponse.data.id;
            return Response.json({ customerId });
        }

        // If no CPF provided, indicate that CPF is required
        return Response.json({ requiresCpf: true }, { status: 400 });

    } catch (error) {
        console.error("Error checking/creating Asaas user:", error.response ? error.response.data : error.message);
        
        // Handle specific errors
        if (error.response && error.response.data && error.response.data.errors) {
            const cpfError = error.response.data.errors.find(err => err.code === 'invalidValue' && err.field === 'cpfCnpj');
            if (cpfError) {
                return Response.json({ error: 'CPF inválido ou já cadastrado.' }, { status: 400 });
            }
        }
        return Response.json({ error: 'Erro ao processar cliente.' }, { status: 500 });
    }
}