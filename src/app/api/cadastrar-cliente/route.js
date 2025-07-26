import axios from 'axios';

const ASAAS_API = process.env.ASAAS_API_URL + '/customers';
const ASAAS_TOKEN = "$"+process.env.ASAAS_TOKEN;
const headers = {
    'access_token': ASAAS_TOKEN,
    'content-type': 'application/json',
    'Accept': 'application/json',
  };
export async function POST(request) {
    const { nome, email, cpfCnpj, telefone } = await request.json();

    try {
        const response = await axios.post(
            ASAAS_API, {
                name: nome,
                email : email,
                cpfCnpj : cpfCnpj
            }, {
                headers : headers
            }
        );

        return Response.json(response.data);
    } catch (error) {
        console.error(error.response);
        return Response.json({ error: 'Erro ao cadastrar cliente.' }, { status: 500 });
    }
}