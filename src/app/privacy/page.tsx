export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
        <p className="mb-4">
          We collect information that you provide directly to us, including name, email address, 
          and any other information you choose to provide.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
        <p className="mb-4">
          We use the information we collect to:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Provide and maintain our services</li>
          <li>Respond to your requests and inquiries</li>
          <li>Send you technical notices and updates</li>
          <li>Improve our services</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
        <p className="mb-4">
          We do not sell, trade, or otherwise transfer your personal information to third parties 
          without your consent, except as required by law.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
        <p className="mb-4">
          We implement appropriate security measures to protect your personal information from 
          unauthorized access, alteration, disclosure, or destruction.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Contact Us</h2>
        <p className="mb-4">
          If you have any questions about our Privacy Policy, please contact us at:
          <br />
          Email: privacy@vivaafro.com
        </p>
      </section>

      <footer className="text-sm text-gray-600">
        Last updated: {new Date().toLocaleDateString()}
      </footer>
    </div>
  );
}
