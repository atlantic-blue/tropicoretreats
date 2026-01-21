import React from "react";
import { Link } from "react-router";
import { Shield } from "lucide-react";

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-emerald-900 py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-800">
            <Shield className="h-8 w-8 text-emerald-100" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Privacy Policy
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
              Tropico Retreats ("we", "our", or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you visit our website or use our services.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              2. Information We Collect
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We may collect personal information that you voluntarily provide to us when you:
            </p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>Fill out our contact or enquiry forms</li>
              <li>Subscribe to our newsletter</li>
              <li>Request a quote for our services</li>
              <li>Communicate with us via email, phone, or WhatsApp</li>
            </ul>
            <p className="mt-4 text-gray-600 leading-relaxed">
              This information may include your name, email address, phone number, company name,
              and details about your retreat requirements.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              3. How We Use Your Information
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>Respond to your enquiries and provide requested services</li>
              <li>Send you quotes and proposals for corporate retreats</li>
              <li>Communicate with you about your booking or potential booking</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Improve our website and services</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              4. Cookies and Tracking
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Our website uses cookies and similar tracking technologies to enhance your browsing
              experience and analyse website traffic. You can control cookie preferences through
              your browser settings or our cookie consent banner.
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">We use:</p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>
                <strong>Essential cookies:</strong> Required for basic website functionality
              </li>
              <li>
                <strong>Analytics cookies:</strong> Help us understand how visitors use our website
              </li>
              <li>
                <strong>Marketing cookies:</strong> Used to deliver relevant advertisements
              </li>
            </ul>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              5. Data Sharing and Disclosure
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>Service providers who assist in delivering our services (venues, transport, etc.)</li>
              <li>Professional advisers (lawyers, accountants)</li>
              <li>Regulatory authorities when required by law</li>
            </ul>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              6. Data Security
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We implement appropriate technical and organisational measures to protect your
              personal information against unauthorised access, alteration, disclosure, or
              destruction. However, no internet transmission is completely secure, and we cannot
              guarantee absolute security.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              7. Your Rights
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Under applicable data protection laws, you may have the right to:
            </p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Object to processing of your information</li>
              <li>Request restriction of processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              8. Data Retention
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We retain your personal information only for as long as necessary to fulfil the
              purposes for which it was collected, including to satisfy legal, accounting, or
              reporting requirements.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              9. International Transfers
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Your information may be transferred to and processed in countries outside your
              country of residence, including Colombia and the United Kingdom. We ensure
              appropriate safeguards are in place to protect your information in accordance
              with this Privacy Policy.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              10. Changes to This Policy
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page and updating the "Last
              updated" date.
            </p>

            <h2 className="mt-12 font-serif text-2xl font-bold text-gray-900">
              11. Contact Us
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices,
              please contact us:
            </p>
            <div className="mt-4 rounded-xl bg-gray-50 p-6">
              <p className="font-semibold text-gray-900">Tropico Retreats</p>
              <p className="mt-2 text-gray-600">Email: privacy@tropicoretreat.com</p>
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

export default PrivacyPage;
