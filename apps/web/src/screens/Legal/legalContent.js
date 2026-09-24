// Verbatim content for the /terms and /privacy pages, supplied as the
// platform's actual legal documents (not paraphrased or edited here) -
// including their own placeholder brackets (e.g. "[legal contact email to
// be added]") and draft-status footer note, which are part of the source
// documents themselves. Template literals throughout (not single-quoted
// strings) since the source text uses straight apostrophes and straight
// double quotes freely - backticks avoid needing to escape either.
//
// Each doc is { title, subtitle, effectiveDate, sections, docNote }.
// A section is { heading, blocks }, where a block is either
// { type: 'p', text } or { type: 'ul', items }.

export const TERMS_CONTENT = {
  title: 'Terms & Conditions',
  subtitle: `The rules for using the Sajilo Bazar Platform.`,
  effectiveDate: `Effective date: 24 September 2026`,
  sections: [
    {
      heading: `1. Acceptance of Terms`,
      blocks: [
        {
          type: 'p',
          text: `These Terms & Conditions ("Terms") govern your use of the Sajilo Bazar application and website (the "Platform"), operated by Sajilo Bazar (operated by Saroj Aryal) ("Sajilo Bazar," "we," "us"). By creating an account or using the Platform, you agree to these Terms.`,
        },
      ],
    },
    {
      heading: `2. Eligibility`,
      blocks: [
        { type: 'p', text: `You must be at least 18 years old to register as a customer or worker on the Platform.` },
      ],
    },
    {
      heading: `3. What Sajilo Bazar Is`,
      blocks: [
        {
          type: 'p',
          text: `Sajilo Bazar is a matching platform that connects customers who need home services with independent workers who provide them. Sajilo Bazar is an intermediary: it does not itself perform, supervise, or guarantee the quality of any service booked through the Platform. The actual service is performed directly between the customer and the worker.`,
        },
      ],
    },
    {
      heading: `4. Account Registration`,
      blocks: [
        {
          type: 'ul',
          items: [
            `You must provide accurate information when registering and keep your login credentials secure.`,
            `One account per person. You are responsible for all activity under your account.`,
            `Worker accounts require successful document verification before the worker can appear in search results or receive job requests.`,
          ],
        },
      ],
    },
    {
      heading: `5. Worker Terms`,
      blocks: [
        {
          type: 'ul',
          items: [
            `Workers use the Platform as independent individuals. Nothing in these Terms creates an employment, agency, or partnership relationship between a worker and Sajilo Bazar.`,
            `Workers may only offer services within their verified category by default. Offering services in another category requires admin review, and may require a supporting document for categories designated as higher-risk.`,
            `Sajilo Bazar charges a commission of 15% on the agreed price of each completed job. This commission is deducted from a worker's prepaid credit balance held with the Platform, rather than collected directly from the payment made by the customer.`,
            `A worker's Trust Score, cancellation rate, and dispute record may affect their visibility on the Platform, and repeated violations of these Terms may lead to an admin review of the worker's account, up to and including suspension.`,
          ],
        },
      ],
    },
    {
      heading: `6. Customer Terms`,
      blocks: [
        {
          type: 'ul',
          items: [
            `Customers agree to honor accepted bookings and to pay the agreed price for completed work.`,
            `The Platform does not guarantee that a worker will be available for any specific request, whether urgent or scheduled.`,
            `Customers agree to use the Platform only to request genuine services.`,
          ],
        },
      ],
    },
    {
      heading: `7. Bookings, Pricing, and Payment`,
      blocks: [
        {
          type: 'ul',
          items: [
            `The price for a job is agreed between the customer and the worker; the worker confirms the final price in the Platform when marking a job complete.`,
            `At launch, payment is made directly between customer and worker in cash. The worker selects a payment method and marks the booking as paid once payment is received; a paid receipt is then saved on that booking, viewable by both parties.`,
            `Additional payment methods (such as eSewa) may be added in the future and will be reflected in the Platform when available.`,
            `Sajilo Bazar does not set, guarantee, or arbitrate the price of any job beyond what is agreed between customer and worker.`,
          ],
        },
      ],
    },
    {
      heading: `8. Dealing Outside the Platform`,
      blocks: [
        {
          type: 'p',
          text: `You are free to choose whether to arrange or complete a job outside the Platform. However, if a job is arranged or completed outside Sajilo Bazar, there is no record of it on the Platform. This means Sajilo Bazar is not able to assist with a dispute, provide supporting evidence, or otherwise intervene on behalf of either party for any arrangement that takes place off-Platform, including for the purposes of any legal action a party may wish to pursue.`,
        },
      ],
    },
    {
      heading: `9. Trust Score, Ratings, and Reviews`,
      blocks: [
        {
          type: 'p',
          text: `The Platform calculates a Trust Score for each worker based on ratings, job completion rate, account tenure, and dispute history. Customers may rate and review a worker after a completed job. The Trust Score and ratings are informational and do not constitute a guarantee of a worker's skill, conduct, or reliability.`,
        },
      ],
    },
    {
      heading: `10. Prohibited Conduct`,
      blocks: [
        { type: 'p', text: `You agree not to:` },
        {
          type: 'ul',
          items: [
            `Submit false, fraudulent, or altered verification documents`,
            `Post fake ratings or reviews`,
            `Harass, threaten, or endanger another user`,
            `Use the Platform for any unlawful purpose`,
          ],
        },
      ],
    },
    {
      heading: `11. Disputes`,
      blocks: [
        {
          type: 'p',
          text: `A dispute may be filed on any active booking (accepted or in progress) with no deadline. Once a booking is marked completed, a dispute may still be filed, but only within 24 hours of completion. Chat messages and attachments associated with a booking may be reviewed as part of resolving a dispute. Sajilo Bazar's administrators review disputes and their decisions are final within the Platform.`,
        },
      ],
    },
    {
      heading: `12. Account Suspension and Termination`,
      blocks: [
        {
          type: 'p',
          text: `Sajilo Bazar may suspend or terminate an account, at its discretion, for violation of these Terms or for conduct that risks the safety or integrity of the Platform. A user whose account is suspended may request a review of that decision through the Platform's support channel.`,
        },
      ],
    },
    {
      heading: `13. Disclaimers and Limitation of Liability`,
      blocks: [
        {
          type: 'p',
          text: `Sajilo Bazar is a matching platform only. To the fullest extent permitted by law, Sajilo Bazar disclaims responsibility for the quality, safety, or legality of any service performed by a worker, and for any property damage, injury, or loss arising from a job booked through the Platform. Services are performed by independent workers, not by Sajilo Bazar.`,
        },
      ],
    },
    {
      heading: `14. Force Majeure`,
      blocks: [
        {
          type: 'p',
          text: `Sajilo Bazar is not liable for any delay or failure in providing the Platform's services caused by events outside its reasonable control, including but not limited to natural events, monsoon-related disruption, power or internet outages, or government action.`,
        },
      ],
    },
    {
      heading: `15. Governing Law and Jurisdiction`,
      blocks: [
        {
          type: 'p',
          text: `These Terms are governed by the laws of Nepal. Any dispute arising from these Terms or your use of the Platform is subject to the jurisdiction of the courts of Nepal.`,
        },
      ],
    },
    {
      heading: `16. Changes to These Terms`,
      blocks: [
        {
          type: 'p',
          text: `We may update these Terms from time to time. Continued use of the Platform after a change takes effect constitutes acceptance of the updated Terms.`,
        },
      ],
    },
    {
      heading: `17. Contact Us`,
      blocks: [{ type: 'p', text: `Questions about these Terms can be sent to: [legal contact email to be added].` }],
    },
  ],
  docNote: `Sajilo Bazar Terms & Conditions · Draft for legal review · Not yet published`,
};

export const PRIVACY_CONTENT = {
  title: 'Privacy Policy',
  subtitle: `How Sajilo Bazar collects, uses, and protects your information.`,
  effectiveDate: `Effective date: 24 September 2026`,
  sections: [
    {
      heading: `1. Who We Are`,
      blocks: [
        {
          type: 'p',
          text: `This Privacy Policy is issued by Sajilo Bazar (operated by Saroj Aryal) ("Sajilo Bazar," "we," "us," or "our"), the operator of the Sajilo Bazar mobile and web application (the "Platform"). This entity name reflects the Platform's current pre-registration stage and will be updated once formal business registration is complete.`,
        },
        {
          type: 'p',
          text: `This Policy explains what personal information we collect from customers, workers, and visitors, why we collect it, who can see it, and what rights you have over it.`,
        },
      ],
    },
    {
      heading: `2. Information We Collect`,
      blocks: [
        { type: 'p', text: `Account information` },
        {
          type: 'ul',
          items: [
            `Phone number and password, used to create and secure your account`,
            `Your selected role (customer, worker, or admin)`,
          ],
        },
        { type: 'p', text: `Profile information` },
        {
          type: 'ul',
          items: [`Name, profile photo, bio`, `For workers: skills, service categories, and listed prices`],
        },
        { type: 'p', text: `Verification documents (workers only)` },
        {
          type: 'ul',
          items: [
            `Identity documents and trade/certification proof submitted for admin review before a worker account can go live`,
          ],
        },
        { type: 'p', text: `Location information` },
        {
          type: 'ul',
          items: [`Used to match customers with nearby workers and to power search and instant job requests`],
        },
        { type: 'p', text: `Booking and communication data` },
        {
          type: 'ul',
          items: [
            `Booking history, in-app chat messages, and any photo or PDF attachments shared within a booking's chat`,
          ],
        },
        { type: 'p', text: `Ratings, reviews, and trust information` },
        {
          type: 'ul',
          items: [
            `Ratings and written reviews left after a completed job`,
            `Data used to calculate a worker's Trust Score (rating history, job completion rate, account tenure, and dispute record)`,
          ],
        },
        { type: 'p', text: `Payment and receipt information` },
        {
          type: 'ul',
          items: [
            `The agreed price for a job, the selected payment method, and the paid-receipt confirmation recorded on a completed booking. Sajilo Bazar does not process or store card or bank payment details, as payments are currently made directly between customer and worker.`,
          ],
        },
      ],
    },
    {
      heading: `3. How We Use Your Information`,
      blocks: [
        {
          type: 'ul',
          items: [
            `To create and manage your account and verify worker eligibility`,
            `To match customers and workers, and to operate booking, chat, and payment-confirmation features`,
            `To calculate and display Trust Scores and ratings`,
            `To investigate disputes and enforce our Terms & Conditions`,
            `To provide customer support and respond to inquiries`,
            `To maintain the security and integrity of the Platform`,
          ],
        },
      ],
    },
    {
      heading: `4. Who Can See Your Information`,
      blocks: [
        { type: 'p', text: `Sajilo Bazar limits visibility of sensitive information by design:` },
        {
          type: 'ul',
          items: [
            `A worker's phone number is never shown on their public profile or in search results. It becomes visible to a customer only while a booking is active (accepted or in progress), and is hidden again once the job is completed.`,
            `A worker's full Trust Score breakdown (rating, reliability, tenure, and dispute record) is visible only to that worker and to platform administrators. Customers see only a simplified trust tier and meter — never the underlying numbers or dispute history.`,
            `Chat messages and attachments within a booking are visible to the customer and worker on that booking, and may be reviewed by administrators if a dispute is filed on that booking.`,
          ],
        },
      ],
    },
    {
      heading: `5. Third-Party Service Providers`,
      blocks: [
        {
          type: 'p',
          text: `We use the following third-party service providers to operate the Platform. Each processes only the data necessary to perform its function:`,
        },
        {
          type: 'ul',
          items: [
            `Neon — database hosting for the Platform's core data. Hosting region: [Neon hosting region — to be confirmed and inserted here].`,
            `Cloudinary — storage for verification documents, profile photos, and chat attachments.`,
            `Render — backend application hosting. Hosting region: Oregon, United States.`,
            `Vercel — frontend application hosting. Hosting region: United States (default deployment region).`,
          ],
        },
        {
          type: 'p',
          text: `Exact hosting regions for Neon should be confirmed directly from the Neon project dashboard before this Policy is published; the placeholder above should be replaced with the confirmed region.`,
        },
      ],
    },
    {
      heading: `6. International Data Transfers`,
      blocks: [
        {
          type: 'p',
          text: `Because some of our service providers operate infrastructure outside Nepal, your information may be stored and processed outside the country in which you use the Platform. By using Sajilo Bazar, you acknowledge this transfer of information as described in this Policy.`,
        },
      ],
    },
    {
      heading: `7. Data Retention`,
      blocks: [
        {
          type: 'ul',
          items: [
            `Rejected worker verification documents are retained for approximately 90 days after rejection, then deleted.`,
            `If you delete your account, your personal identifying information is anonymized. Booking history and dispute records are retained in anonymized form for legal, accounting, and fraud-prevention purposes.`,
          ],
        },
      ],
    },
    {
      heading: `8. Your Rights`,
      blocks: [
        { type: 'p', text: `You may request access to, correction of, or deletion of your personal information.` },
        {
          type: 'p',
          text: `An in-app "Request my data" / "Delete my account" feature is planned and will be added to the Platform. Until it is available, requests can be made using the contact details at the end of this Policy.`,
        },
      ],
    },
    {
      heading: `9. Minimum Age`,
      blocks: [
        {
          type: 'p',
          text: `Sajilo Bazar is intended for users aged 18 and older. We do not knowingly allow anyone under 18 to register as a customer or worker.`,
        },
      ],
    },
    {
      heading: `10. Cookies and Tracking`,
      blocks: [
        {
          type: 'p',
          text: `The Platform does not currently use third-party analytics or advertising tracking tools. It stores only the functional data needed to keep you signed in and to operate the app (such as session tokens).`,
        },
      ],
    },
    {
      heading: `11. Data Security and Breach Notification`,
      blocks: [
        {
          type: 'p',
          text: `We take reasonable technical and organizational measures to protect your information. In the event of a data breach affecting your personal information, we will notify affected users without undue delay.`,
        },
      ],
    },
    {
      heading: `12. Changes to This Policy`,
      blocks: [
        {
          type: 'p',
          text: `We may update this Privacy Policy from time to time. Material changes will be highlighted within the Platform.`,
        },
      ],
    },
    {
      heading: `13. Contact Us`,
      blocks: [
        {
          type: 'p',
          text: `Questions about this Policy or requests regarding your personal information can be sent to: [privacy contact email to be added].`,
        },
      ],
    },
  ],
  docNote: `Sajilo Bazar Privacy Policy · Draft for legal review · Not yet published`,
};
