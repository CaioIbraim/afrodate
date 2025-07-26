import PixPayment from '@/components/PixPayment';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <h1 className="text-2xl font-bold mb-6">Pagamento com PIX - R$29,90</h1>
      <PixPayment />
    </main>
  );
}