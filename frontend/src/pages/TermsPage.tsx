import React from 'react';
import { Link } from 'react-router';
import { FileText } from 'lucide-react';
import SEO from '../components/SEO';

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      <SEO
        title="Terms & Conditions"
        description="Review Tropico Retreats' Terms and Conditions. Understand our booking process, payment terms, cancellation policy, and service agreements for corporate retreats in Colombia."
        canonicalUrl="/terms"
        noIndex={false}
      />

      {/* Header */}
      <section className="bg-emerald-900 py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-800">
            <FileText className="h-8 w-8 text-emerald-100" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Terms & Conditions
          </h1>
          <p className="mt-4 text-emerald-100">Last updated: January 2025</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-12">
          <div className="prose prose-lg max-w-none">
            <h2 className="font-serif text-2xl font-bold text-gray-900">1. Introduction</h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              These Terms and Conditions ("Terms") govern your use of the Tropico Retreats website
              and our corporate retreat planning services. By using our website or engaging our
              services, you agree to be bound by these Terms.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">2. Services</h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Tropico Retreats provides corporate retreat planning and coordination services in
              Colombia, including but not limited to:
            </p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>Accommodation arrangements</li>
              <li>Transport logistics</li>
              <li>Venue booking and coordination</li>
              <li>Activity planning and team building experiences</li>
              <li>Catering and dining arrangements</li>
              <li>Entertainment and leisure activities</li>
            </ul>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              3. Booking and Payments
            </h2>
            <h3 className="mt-6 font-serif text-xl font-semibold text-gray-900">
              3.1 Booking Process
            </h3>
            <p className="mt-4 text-gray-600 leading-relaxed">
              All bookings are subject to availability and confirmation. A booking is only confirmed
              once we have received the required deposit and issued a written confirmation.
            </p>
            <h3 className="mt-6 font-serif text-xl font-semibold text-gray-900">3.2 Deposits</h3>
            <p className="mt-4 text-gray-600 leading-relaxed">
              A non-refundable deposit of 30% of the total estimated cost is required to secure your
              booking. The remaining balance is due 30 days prior to the retreat start date.
            </p>
            <h3 className="mt-6 font-serif text-xl font-semibold text-gray-900">
              3.3 Payment Methods
            </h3>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We accept bank transfers and major credit cards. All prices are quoted in GBP unless
              otherwise specified.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              4. Cancellation Policy
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Cancellations must be made in writing. The following cancellation fees apply:
            </p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>
                <strong>More than 60 days before:</strong> Deposit forfeited
              </li>
              <li>
                <strong>30-60 days before:</strong> 50% of total cost
              </li>
              <li>
                <strong>Less than 30 days before:</strong> 100% of total cost
              </li>
            </ul>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We strongly recommend purchasing comprehensive travel insurance to cover unforeseen
              circumstances.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              5. Changes and Modifications
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We reserve the right to make changes to your itinerary if circumstances require,
              including but not limited to weather conditions, venue availability, or safety
              concerns. We will always endeavour to provide suitable alternatives of equal or higher
              value.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">6. Liability</h2>
            <h3 className="mt-6 font-serif text-xl font-semibold text-gray-900">
              6.1 Our Liability
            </h3>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Tropico Retreats acts as an intermediary between you and various service providers. We
              are not liable for the acts, omissions, or defaults of any third-party suppliers,
              including but not limited to hotels, transport companies, restaurants, and activity
              providers.
            </p>
            <h3 className="mt-6 font-serif text-xl font-semibold text-gray-900">
              6.2 Limitation of Liability
            </h3>
            <p className="mt-4 text-gray-600 leading-relaxed">
              To the maximum extent permitted by law, our total liability for any claim arising from
              or related to our services shall not exceed the total amount paid by you for those
              services.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              7. Health and Safety
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Participants are responsible for ensuring they are fit to participate in planned
              activities. You must inform us of any medical conditions, dietary requirements, or
              accessibility needs at the time of booking. We reserve the right to refuse
              participation in activities if we believe it poses a safety risk.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              8. Travel Documents and Visas
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              You are responsible for ensuring all participants have valid passports and any
              required visas for travel to Colombia. Tropico Retreats is not liable for any issues
              arising from inadequate travel documentation.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              9. Intellectual Property
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              All content on this website, including text, graphics, logos, and images, is the
              property of Tropico Retreats and is protected by intellectual property laws. You may
              not reproduce, distribute, or use our content without prior written consent.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              10. Photography and Media
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We may take photographs or videos during retreats for marketing purposes. If you do
              not wish to be photographed, please inform us at the time of booking. By participating
              in a retreat, you grant us permission to use images for promotional purposes unless
              otherwise specified.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">11. Governing Law</h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              These Terms are governed by the laws of England and Wales. Any disputes arising from
              these Terms or our services shall be subject to the exclusive jurisdiction of the
              courts of England and Wales.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              12. Contact Information
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              For any questions about these Terms, please contact us:
            </p>
            <div className="mt-4 rounded-xl bg-gray-50 p-6">
              <p className="font-semibold text-gray-900">Tropico Retreats</p>
              <p className="mt-2 text-gray-600">Email: info@tropicoretreat.com</p>
              <p className="text-gray-600">WhatsApp: +44 7806 705494</p>
            </div>
          </div>

          {/* Back Link */}
          <div className="mt-12 border-t border-gray-200 pt-8">
            <Link
              to="/"
              className="text-emerald-700 transition-colors hover:text-emerald-900 hover:underline"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsPage;
