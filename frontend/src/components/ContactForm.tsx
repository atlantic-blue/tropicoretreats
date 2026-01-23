import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useToast } from './Toast';
import { submitContact } from '../api/submitContact';
import { ContactFormData, initialFormData, SubmissionState } from '../types/contact';

interface ContactFormProps {
  /** Optional title above the form */
  title?: string;
  /** Optional description below the title */
  description?: string;
  /** Optional className for the form container */
  className?: string;
}

const ContactForm: React.FC<ContactFormProps> = ({
  title = 'Send Us an Enquiry',
  description = "Fill out the form below and we'll be in touch shortly.",
  className = '',
}) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');

  // Generic change handler for all form fields
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submissionState === 'submitting') return; // Prevent double-submit

    setSubmissionState('submitting');

    const result = await submitContact(formData);

    if (result.success) {
      setSubmissionState('success');
      setFormData(initialFormData); // Clear form
      showToast('success', "Thanks! We'll be in touch soon.");
    } else {
      setSubmissionState('error');
      showToast(
        'error',
        'Oops! Something went wrong.',
        result.message,
        () => handleSubmit(e) // Retry callback
      );
    }
  };

  const isSubmitting = submissionState === 'submitting';

  const inputClasses =
    'mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div className={className}>
      {title && <h3 className="text-2xl font-bold text-gray-900">{title}</h3>}
      {description && <p className="mt-2 text-gray-600">{description}</p>}

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <fieldset disabled={isSubmitting} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className={inputClasses}
                placeholder="John"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Smith"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className={inputClasses}
              placeholder="john@company.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={inputClasses}
              placeholder="+44 7000 000000"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-semibold text-gray-700">
              Company Name
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Company Ltd"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="groupSize" className="block text-sm font-semibold text-gray-700">
                Group Size
              </label>
              <select
                id="groupSize"
                name="groupSize"
                value={formData.groupSize}
                onChange={handleChange}
                className={inputClasses}
              >
                <option value="">Select size</option>
                <option value="8-15">8-15 guests</option>
                <option value="16-25">16-25 guests</option>
                <option value="26-40">26-40 guests</option>
                <option value="40+">40+ guests</option>
              </select>
            </div>
            <div>
              <label htmlFor="preferredDates" className="block text-sm font-semibold text-gray-700">
                Preferred Dates
              </label>
              <input
                type="text"
                id="preferredDates"
                name="preferredDates"
                value={formData.preferredDates}
                onChange={handleChange}
                className={inputClasses}
                placeholder="e.g., March 2026"
              />
            </div>
          </div>

          <div>
            <label htmlFor="destination" className="block text-sm font-semibold text-gray-700">
              Preferred Destination
            </label>
            <select
              id="destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="">Select destination</option>
              <option value="caribbean">Caribbean Coast</option>
              <option value="coffee-region">Coffee Region</option>
              <option value="casanare">Casanare</option>
              <option value="not-sure">Not sure yet</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-semibold text-gray-700">
              Tell Us About Your Retreat *
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              required
              value={formData.message}
              onChange={handleChange}
              className={`${inputClasses} resize-none`}
              placeholder="What are your goals for the retreat? Any specific activities or experiences you're interested in?"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#C9A227] px-8 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-[#C9A227]/30 transition-all duration-300 hover:bg-[#B8860B] hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Enquiry
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ContactForm;
