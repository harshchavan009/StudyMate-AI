import { Card } from "@/components/ui/Card";
import { usePageMeta } from "@/lib/usePageMeta";

export function PrivacyPolicy() {
  usePageMeta("Privacy Policy", "Review StudyMate AI data handling and privacy practices.");

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-medium text-ink tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-ink-secondary">
          Last revised: November 2026. Please review and update contact placeholders before production deployment.
        </p>
      </div>

      <Card className="markdown-document space-y-6 p-8">
        <section>
          <h2>1. Overview and Scope</h2>
          <p>
            StudyMate AI ("we", "our", or "the application") is an educational tool designed to summarize study materials, generate practice quizzes, provide feedback on draft answers, and explain academic concepts. This Privacy Policy outlines how your information is handled when you use the service.
          </p>
        </section>

        <section>
          <h2>2. Information You Provide</h2>
          <p>
            The application processes the study materials, lecture notes, questions, and draft answers you submit directly into the input fields. We do not require accounts, logins, email addresses, passwords, or payment credentials.
          </p>
        </section>

        <section>
          <h2>3. How Information Is Processed</h2>
          <p>
            When you submit a request, your text is transmitted via secure HTTPS encryption to our backend server and passed directly to the Google Gemini API to generate the requested summary, quiz, revision, or explanation.
          </p>
          <ul>
            <li>No persistent database: Your submitted texts are processed strictly in memory for the duration of the request and are not stored in any application database.</li>
            <li>No data sales: We never sell, rent, or monetize your study materials or personal information.</li>
            <li>No tracking cookies: We do not deploy third-party advertising cookies or cross-site tracking pixels.</li>
          </ul>
        </section>

        <section>
          <h2>4. Client Storage (Local Storage)</h2>
          <p>
            The application stores minimal client-side state in your browser local storage (such as recent session history, unsent drafts, and text size preference) purely for your convenience. This data is stored only on your own device and is never transmitted to an analytics server or database. You can clear this data at any time using the Clear buttons.
          </p>
        </section>

        <section>
          <h2>5. Google Gemini API Data Policies</h2>
          <p>
            Core AI capabilities are powered by the Google Gemini API. When running on free API tiers, Google's Generative AI Additional Terms of Service allow Google to use prompt texts and model responses to train and improve its machine learning models, and content may be reviewed by human reviewers (see the <a href="https://ai.google.dev/terms" target="_blank" rel="noopener noreferrer" className="text-brand underline">Google Gemini API Terms of Service</a>).
          </p>
          <p>
            Users must not submit confidential, medical, proprietary, or personally identifiable sensitive information into StudyMate AI. On paid or enterprise Google Cloud Vertex AI deployments, customer data is not used for model training.
          </p>
        </section>

        <section>
          <h2>6. Contact and Inquiries</h2>
          <p>
            For questions regarding this policy or data practices, please contact:
          </p>
          <p className="text-ink-secondary">
            [Insert Contact Name / Organization Name]<br />
            [Insert Contact Email Address]<br />
            [Insert Contact Postal Address]
          </p>
        </section>
      </Card>
    </div>
  );
}
