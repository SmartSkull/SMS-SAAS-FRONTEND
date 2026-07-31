import Link from 'next/link';

export default function TermsPage() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By registering a school on Smart Campus ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use the Platform to register a school.',
    },
    {
      title: '2. Registration & Approval',
      content: 'School registration is subject to review and approval by Smart Campus. Submitting a registration does not guarantee approval. We reserve the right to accept or reject any registration at our sole discretion.',
    },
    {
      title: '3. Accurate Information',
      content: 'You agree to provide accurate, current, and complete information during registration, including school name, contact details, and logo. You are responsible for updating this information to keep it accurate.',
    },
    {
      title: '4. Account Responsibilities',
      content: 'Upon approval, the school administrator is responsible for all activity that occurs under the school account, including managing staff, students, and the security of login credentials.',
    },
    {
      title: '5. Acceptable Use',
      content: 'You agree not to misuse the Platform, including attempting to access other schools\' data, disrupting services, uploading malicious content, or using the Platform for unlawful purposes.',
    },
    {
      title: '6. Data & Privacy',
      content: 'Student and staff data entered into the Platform is treated as confidential. Our Privacy Policy explains how data is collected, stored, and protected. You are responsible for obtaining any necessary parental or guardian consent for students under your care.',
    },
    {
      title: '7. Fees & Payments',
      content: 'Certain features of the Platform may be subject to fees. Any applicable fees will be communicated clearly before purchase. Failure to pay may result in suspension of access.',
    },
    {
      title: '8. Intellectual Property',
      content: 'The Platform, including its software, design, and branding, is owned by Smart Campus. You may not copy, modify, or distribute any part of the Platform without written permission.',
    },
    {
      title: '9. Limitation of Liability',
      content: 'Smart Campus provides the Platform "as is" without warranties of any kind. To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of the Platform.',
    },
    {
      title: '10. Termination',
      content: 'We may suspend or terminate your access to the Platform if you breach these Terms, or for any other reason with reasonable notice where possible. You may discontinue use of the Platform at any time.',
    },
    {
      title: '11. Changes to Terms',
      content: 'We may update these Terms from time to time. Continued use of the Platform after changes are posted constitutes acceptance of the revised Terms.',
    },
    {
      title: '12. Contact',
      content: 'For questions about these Terms and Conditions, please contact us through the school registration or support channels on the Platform.',
    },
  ];

  return (
    <div>
      <section className="bg-blue-900 text-white py-20 px-4 text-center">
        <h1 className="text-4xl font-extrabold mb-4">Terms & Conditions</h1>
        <p className="text-white/70">Please read these terms carefully before registering your school.</p>
      </section>
      <section className="py-16 px-4 max-w-3xl mx-auto space-y-6">
        <p className="text-sm text-gray-500">Last updated: July 2026</p>
        {sections.map(({ title, content }) => (
          <div key={title} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{content}</p>
          </div>
        ))}
        <div className="pt-6 text-center">
          <Link href="/school/register" className="inline-block rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white hover:bg-blue-800 transition-colors">
            Back to Registration
          </Link>
        </div>
      </section>
    </div>
  );
}
