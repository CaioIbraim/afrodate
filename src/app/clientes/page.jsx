import ClienteForm from '@/components/ClienteForm';

export default function CadastrarCliente() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">Cadastrar Cliente</h1>
      <ClienteForm />
    </main>
  );
}