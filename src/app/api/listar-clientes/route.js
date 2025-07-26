import axios from 'axios';

const ASAAS_API = process.env.ASAAS_API_URL + '/customers';
const ASAAS_TOKEN = "$" + process.env.ASAAS_TOKEN;

const headers = {
    'access_token': ASAAS_TOKEN,
    'content-type': 'application/json',
    'Accept': 'application/json',
};

console.log("API URL: ", ASAAS_API);
console.log("Request Headers: ", headers);

export async function GET() {
    try {
        const response = await axios.get(ASAAS_API, { headers });

        return Response.json(response.data);
    } catch (error) {
        console.error("Erro ao listar clientes:", error);
        return Response.json({ error: 'Erro ao listar clientes' }, { status: 500 });
    }
}
