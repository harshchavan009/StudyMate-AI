import { Card } from "@/components/ui/Card";

export function PrivacyPolicy() {
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
            StudyMate AI ("we", "our", or "the application") is a study assistance platform designed to summarize academic texts, generate active-recall quizzes, improve draft student answers, and explain complex concepts. This Privacy Policy describes how information is collected, processed, and protected when you use our services.
          </p>
        </section>

        <section>
          <h2>2. Information You Provide</h2>
          <p>
            The application processes the study materials, questions, notes, and draft answers you submit directly into the input fields. We do not require user accounts, email addresses, passwords, or payment credentials.
          </p>
        </section>

        <section>
          <h2>3. How Information Is Processed</h2>
          <p>
            When you submit a request, the text is transmitted via secure HTTPS encryption to our backend server and passed to the Google Gemini API to generate the requested summary, quiz, revision, or explanation.
          </p>
          <ul>
            <li>No persistent database: Your submitted texts are processed in memory for the duration of the request and are not stored in any application database.</li>
            <li>No data sales: We never sell, rent, or monetize your study materials or personal information.</li>
            <li>No tracking cookies: We do not deploy third-party advertising cookies or cross-site tracking pixels.</li>
          </ul>
        </section>

        <section>
          <h2>4. Client Storage (Local Storage)</h2>
          <p>
            The application may store minimal client-side state in your browser local storage (such as UI theme preferences, sidebar collapse state, or recent input drafts) purely for your convenience. This data never leaves your device.
          </p>
        </section>

        <section>
          <h2>5. Third-Party Service Providers</h2>
          <p>
            The core AI generation functionality is powered by the Google Gemini API. Data sent to Google is subject to the Google Cloud Privacy Notice and Gemini API Terms of Service. We recommend avoiding submission of personally identifiable sensitive information or confidential trade secrets.
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
