// One-time (but safe to re-run) seed for the three policy documents, now
// that they're stored in content_items.sections instead of a hardcoded JS
// file (QA2 item 4 - see migration 056's comment for the full context).
// Terms & Conditions and Privacy Policy below are the exact text that used
// to live in apps/web/src/screens/Legal/legalContent.js (deleted as part
// of this same change, now that this is the one copy of it) - same
// headings, same wording, just reshaped from {heading, blocks} into
// {heading, body} per section, where a run of "- " lines is a bullet list
// and anything else is a paragraph (see apps/web/src/lib/policySections.js,
// the exact inverse of that reshaping). Community Guidelines is new -
// there was no existing draft anywhere in this repo or its docs to port,
// so it's freshly written here, in the same voice and tied to the same
// mechanisms (Trust Score, disputes, verification) the other two docs
// already describe.
//
// Usage:
//   npm run seed:policies --workspace apps/api
//   DATABASE_URL="<neon connection string>" npm run seed:policies --workspace apps/api

import 'dotenv/config';
import { pool } from './pool.js';

const EFFECTIVE_DATE = 'Effective date: 24 September 2026';

const TERMS = {
  title: 'Terms & Conditions',
  subtitle: 'The rules for using the Sajilo Bazar Platform.',
  effectiveDate: EFFECTIVE_DATE,
  docNote: 'Sajilo Bazar Terms & Conditions · Draft for legal review · Not yet published',
  sections: [
    {
      heading: '1. Acceptance of Terms',
      body: `These Terms & Conditions ("Terms") govern your use of the Sajilo Bazar application and website (the "Platform"), operated by Sajilo Bazar (operated by Saroj Aryal) ("Sajilo Bazar," "we," "us"). By creating an account or using the Platform, you agree to these Terms.`,
    },
    {
      heading: '2. Eligibility',
      body: `You must be at least 18 years old to register as a customer or worker on the Platform.`,
    },
    {
      heading: '3. What Sajilo Bazar Is',
      body: `Sajilo Bazar is a matching platform that connects customers who need home services with independent workers who provide them. Sajilo Bazar is an intermediary: it does not itself perform, supervise, or guarantee the quality of any service booked through the Platform. The actual service is performed directly between the customer and the worker.`,
    },
    {
      heading: '4. Account Registration',
      body: `- You must provide accurate information when registering and keep your login credentials secure.
- One account per person. You are responsible for all activity under your account.
- Worker accounts require successful document verification before the worker can appear in search results or receive job requests.`,
    },
    {
      heading: '5. Worker Terms',
      body: `- Workers use the Platform as independent individuals. Nothing in these Terms creates an employment, agency, or partnership relationship between a worker and Sajilo Bazar.
- Workers may only offer services within their verified category by default. Offering services in another category requires admin review, and may require a supporting document for categories designated as higher-risk.
- Sajilo Bazar charges a commission of 15% on the agreed price of each completed job. This commission is deducted from a worker's prepaid credit balance held with the Platform, rather than collected directly from the payment made by the customer.
- A worker's Trust Score, cancellation rate, and dispute record may affect their visibility on the Platform, and repeated violations of these Terms may lead to an admin review of the worker's account, up to and including suspension.`,
    },
    {
      heading: '6. Customer Terms',
      body: `- Customers agree to honor accepted bookings and to pay the agreed price for completed work.
- The Platform does not guarantee that a worker will be available for any specific request, whether urgent or scheduled.
- Customers agree to use the Platform only to request genuine services.`,
    },
    {
      heading: '7. Bookings, Pricing, and Payment',
      body: `- The price for a job is agreed between the customer and the worker; the worker confirms the final price in the Platform when marking a job complete.
- At launch, payment is made directly between customer and worker in cash. The worker selects a payment method and marks the booking as paid once payment is received; a paid receipt is then saved on that booking, viewable by both parties.
- Additional payment methods (such as eSewa) may be added in the future and will be reflected in the Platform when available.
- Sajilo Bazar does not set, guarantee, or arbitrate the price of any job beyond what is agreed between customer and worker.`,
    },
    {
      heading: '8. Dealing Outside the Platform',
      body: `You are free to choose whether to arrange or complete a job outside the Platform. However, if a job is arranged or completed outside Sajilo Bazar, there is no record of it on the Platform. This means Sajilo Bazar is not able to assist with a dispute, provide supporting evidence, or otherwise intervene on behalf of either party for any arrangement that takes place off-Platform, including for the purposes of any legal action a party may wish to pursue.`,
    },
    {
      heading: '9. Trust Score, Ratings, and Reviews',
      body: `The Platform calculates a Trust Score for each worker based on ratings, job completion rate, account tenure, and dispute history. Customers may rate and review a worker after a completed job. The Trust Score and ratings are informational and do not constitute a guarantee of a worker's skill, conduct, or reliability.`,
    },
    {
      heading: '10. Prohibited Conduct',
      body: `You agree not to:

- Submit false, fraudulent, or altered verification documents
- Post fake ratings or reviews
- Harass, threaten, or endanger another user
- Use the Platform for any unlawful purpose`,
    },
    {
      heading: '11. Disputes',
      body: `A dispute may be filed on any active booking (accepted or in progress) with no deadline. Once a booking is marked completed, a dispute may still be filed, but only within 24 hours of completion. Chat messages and attachments associated with a booking may be reviewed as part of resolving a dispute. Sajilo Bazar's administrators review disputes and their decisions are final within the Platform.`,
    },
    {
      heading: '12. Account Suspension and Termination',
      body: `Sajilo Bazar may suspend or terminate an account, at its discretion, for violation of these Terms or for conduct that risks the safety or integrity of the Platform. A user whose account is suspended may request a review of that decision through the Platform's support channel.`,
    },
    {
      heading: '13. Disclaimers and Limitation of Liability',
      body: `Sajilo Bazar is a matching platform only. To the fullest extent permitted by law, Sajilo Bazar disclaims responsibility for the quality, safety, or legality of any service performed by a worker, and for any property damage, injury, or loss arising from a job booked through the Platform. Services are performed by independent workers, not by Sajilo Bazar.`,
    },
    {
      heading: '14. Force Majeure',
      body: `Sajilo Bazar is not liable for any delay or failure in providing the Platform's services caused by events outside its reasonable control, including but not limited to natural events, monsoon-related disruption, power or internet outages, or government action.`,
    },
    {
      heading: '15. Governing Law and Jurisdiction',
      body: `These Terms are governed by the laws of Nepal. Any dispute arising from these Terms or your use of the Platform is subject to the jurisdiction of the courts of Nepal.`,
    },
    {
      heading: '16. Changes to These Terms',
      body: `We may update these Terms from time to time. Continued use of the Platform after a change takes effect constitutes acceptance of the updated Terms.`,
    },
    {
      heading: '17. Contact Us',
      body: `Questions about these Terms can be sent to: [legal contact email to be added].`,
    },
  ],
};

const PRIVACY = {
  title: 'Privacy Policy',
  subtitle: 'How Sajilo Bazar collects, uses, and protects your information.',
  effectiveDate: EFFECTIVE_DATE,
  docNote: 'Sajilo Bazar Privacy Policy · Draft for legal review · Not yet published',
  sections: [
    {
      heading: '1. Who We Are',
      body: `This Privacy Policy is issued by Sajilo Bazar (operated by Saroj Aryal) ("Sajilo Bazar," "we," "us," or "our"), the operator of the Sajilo Bazar mobile and web application (the "Platform"). This entity name reflects the Platform's current pre-registration stage and will be updated once formal business registration is complete.

This Policy explains what personal information we collect from customers, workers, and visitors, why we collect it, who can see it, and what rights you have over it.`,
    },
    {
      heading: '2. Information We Collect',
      body: `Account information

- Phone number and password, used to create and secure your account
- Your selected role (customer, worker, or admin)

Profile information

- Name, profile photo, bio
- For workers: skills, service categories, and listed prices

Verification documents (workers only)

- Identity documents and trade/certification proof submitted for admin review before a worker account can go live

Location information

- Used to match customers with nearby workers and to power search and instant job requests

Booking and communication data

- Booking history, in-app chat messages, and any photo or PDF attachments shared within a booking's chat

Ratings, reviews, and trust information

- Ratings and written reviews left after a completed job
- Data used to calculate a worker's Trust Score (rating history, job completion rate, account tenure, and dispute record)

Payment and receipt information

- The agreed price for a job, the selected payment method, and the paid-receipt confirmation recorded on a completed booking. Sajilo Bazar does not process or store card or bank payment details, as payments are currently made directly between customer and worker.`,
    },
    {
      heading: '3. How We Use Your Information',
      body: `- To create and manage your account and verify worker eligibility
- To match customers and workers, and to operate booking, chat, and payment-confirmation features
- To calculate and display Trust Scores and ratings
- To investigate disputes and enforce our Terms & Conditions
- To provide customer support and respond to inquiries
- To maintain the security and integrity of the Platform`,
    },
    {
      heading: '4. Who Can See Your Information',
      body: `Sajilo Bazar limits visibility of sensitive information by design:

- A worker's phone number is never shown on their public profile or in search results. It becomes visible to a customer only while a booking is active (accepted or in progress), and is hidden again once the job is completed.
- A worker's full Trust Score breakdown (rating, reliability, tenure, and dispute record) is visible only to that worker and to platform administrators. Customers see only a simplified trust tier and meter — never the underlying numbers or dispute history.
- Chat messages and attachments within a booking are visible to the customer and worker on that booking, and may be reviewed by administrators if a dispute is filed on that booking.`,
    },
    {
      heading: '5. Third-Party Service Providers',
      body: `We use the following third-party service providers to operate the Platform. Each processes only the data necessary to perform its function:

- Neon — database hosting for the Platform's core data. Hosting region: [Neon hosting region — to be confirmed and inserted here].
- Cloudinary — storage for verification documents, profile photos, and chat attachments.
- Render — backend application hosting. Hosting region: Oregon, United States.
- Vercel — frontend application hosting. Hosting region: United States (default deployment region).

Exact hosting regions for Neon should be confirmed directly from the Neon project dashboard before this Policy is published; the placeholder above should be replaced with the confirmed region.`,
    },
    {
      heading: '6. International Data Transfers',
      body: `Because some of our service providers operate infrastructure outside Nepal, your information may be stored and processed outside the country in which you use the Platform. By using Sajilo Bazar, you acknowledge this transfer of information as described in this Policy.`,
    },
    {
      heading: '7. Data Retention',
      body: `- Rejected worker verification documents are retained for approximately 90 days after rejection, then deleted.
- If you delete your account, your personal identifying information is anonymized. Booking history and dispute records are retained in anonymized form for legal, accounting, and fraud-prevention purposes.`,
    },
    {
      heading: '8. Your Rights',
      body: `You may request access to, correction of, or deletion of your personal information.

An in-app "Request my data" / "Delete my account" feature is planned and will be added to the Platform. Until it is available, requests can be made using the contact details at the end of this Policy.`,
    },
    {
      heading: '9. Minimum Age',
      body: `Sajilo Bazar is intended for users aged 18 and older. We do not knowingly allow anyone under 18 to register as a customer or worker.`,
    },
    {
      heading: '10. Cookies and Tracking',
      body: `The Platform does not currently use third-party analytics or advertising tracking tools. It stores only the functional data needed to keep you signed in and to operate the app (such as session tokens).`,
    },
    {
      heading: '11. Data Security and Breach Notification',
      body: `We take reasonable technical and organizational measures to protect your information. In the event of a data breach affecting your personal information, we will notify affected users without undue delay.`,
    },
    {
      heading: '12. Changes to This Policy',
      body: `We may update this Privacy Policy from time to time. Material changes will be highlighted within the Platform.`,
    },
    {
      heading: '13. Contact Us',
      body: `Questions about this Policy or requests regarding your personal information can be sent to: [privacy contact email to be added].`,
    },
  ],
};

// New - no existing draft anywhere to port (see file-level comment).
// Deliberately mirrors the Terms' own numbered-section style and ties
// directly into mechanisms this app already has (Trust Score, disputes,
// document verification, suspension) rather than inventing generic
// marketplace-guidelines boilerplate.
const COMMUNITY_GUIDELINES = {
  title: 'Community Guidelines',
  subtitle: 'What we expect from everyone using Sajilo Bazar.',
  effectiveDate: EFFECTIVE_DATE,
  docNote: 'Sajilo Bazar Community Guidelines · Draft for legal review · Not yet published',
  sections: [
    {
      heading: '1. Purpose of These Guidelines',
      body: `These Community Guidelines describe the standards of conduct expected from every customer and worker on Sajilo Bazar, alongside our Terms & Conditions. Where these Guidelines and the Terms address the same conduct, the Terms govern; these Guidelines explain what that conduct looks like in practice.`,
    },
    {
      heading: '2. Treat Each Other with Respect',
      body: `- Communicate with other users, including in booking chat, the way you'd want to be treated in your own home or workplace.
- Harassment, threats, discriminatory language, or intimidation of any kind are not tolerated, in chat, in a review, or in person.
- Disagreements happen - raise them through a dispute or support ticket rather than through abuse directed at the other party.`,
    },
    {
      heading: '3. Be Honest About the Job',
      body: `- Describe the work you need done, or the services you offer, accurately. A booking built on a misleading description wastes both sides' time and is more likely to end in a dispute.
- Agree on price and scope before work starts, and raise a change in scope as soon as it comes up rather than after the fact.
- Don't use the Platform to request or offer anything illegal, unsafe, or outside what Sajilo Bazar's categories actually cover.`,
    },
    {
      heading: '4. Ratings and Reviews Are for Real Experiences',
      body: `- Only rate or review a job you actually had done through the Platform.
- Write reviews that describe your real experience - not a review written to help or harm someone for reasons unrelated to the job itself.
- Posting fake ratings or reviews, for your own account or anyone else's, is a violation of our Terms and may lead to account review.`,
    },
    {
      heading: "5. Verification Exists for Everyone's Safety",
      body: `- Submit genuine, unaltered documents for identity and category verification. A falsified document is both a Terms violation and a safety risk to the customers who rely on that verification.
- Admin review of documents and of cross-category service requests exists to keep the Platform trustworthy - please respond promptly if a reviewer asks for a resubmission or clarification.`,
    },
    {
      heading: '6. How We Respond to Violations',
      body: `- Most concerns are best raised as a dispute on the booking itself, or through a support ticket if there's no specific booking involved.
- A worker's Trust Score, cancellation rate, and dispute record factor into their standing on the Platform automatically.
- For a clear violation of these Guidelines or the Terms, Sajilo Bazar administrators may take direct action on the account involved, up to and including suspension, as described in the Terms' account suspension section.`,
    },
    {
      heading: '7. Questions',
      body: `Questions about these Guidelines can be sent to: [community contact email to be added].`,
    },
  ],
};

const POLICIES = {
  terms_of_service: TERMS,
  privacy_policy: PRIVACY,
  community_guidelines: COMMUNITY_GUIDELINES,
};

async function run() {
  for (const [policyType, doc] of Object.entries(POLICIES)) {
    const { rows } = await pool.query(
      `UPDATE content_items
       SET title = $2, subtitle = $3, effective_date = $4, doc_note = $5, sections = $6,
           status = 'published', published_at = COALESCE(published_at, now()), updated_at = now()
       WHERE policy_type = $1 AND kind = 'policy'
       RETURNING id`,
      [policyType, doc.title, doc.subtitle, doc.effectiveDate, doc.docNote, JSON.stringify(doc.sections)]
    );
    if (!rows[0]) {
      console.warn(`No content_items row for policy_type='${policyType}' - migration 021 should have seeded it.`);
      continue;
    }
    console.log(`Seeded ${policyType} (id ${rows[0].id}, ${doc.sections.length} sections)`);
  }
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
