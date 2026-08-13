import type { Metadata } from 'next'
import { PageHero } from '@/components/site/PageHero'
import { PageSection } from '@/components/site/PageSection'
import { PUBLISHING_AUTHOR_EXPERIENCE_SURVEY } from '@/lib/publishing/author-experience-survey'
import { AuthorExperienceSurveyClient } from './AuthorExperienceSurveyClient'

export const metadata: Metadata = {
  title: 'Share Your Experience',
  description:
    'Share privacy-minimized feedback about your author experience with J Merrill Publishing.',
}

export default function AuthorExperiencePage() {
  return (
    <div className="pt-[76px]">
      <PageHero
        eyebrow="Author Experience"
        ghost="Experience"
        title={
          <>
            Help us make the
            <br />
            <em className="not-italic italic text-blue-500">publishing experience better.</em>
          </>
        }
        description="This short feedback form helps J Merrill Publishing understand what felt clear, supported, and human in the publishing journey, and where the experience can improve."
        actions={[
          { label: 'Start Feedback', href: '#share-feedback' },
          { label: 'Contact Publishing', href: '/contact' },
        ]}
      />

      <PageSection
        eyebrow="Privacy-Minimized Feedback"
        title={
          <>
            Tell us about the experience,
            <br />
            <em className="not-italic italic text-blue-500">not private details.</em>
          </>
        }
        description={PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.privacyNotice}
      >
        <div id="share-feedback" className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-[28px] border border-gray-200 bg-[#F7F8FA] p-8">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-blue-500">
              What this asks
            </div>
            <ul className="flex flex-col gap-4 text-[14px] font-light leading-[1.75] text-gray-500">
              <li>Onboarding, communication, clarity, editorial, and production experience.</li>
              <li>Whether you felt heard and respected during the process.</li>
              <li>Overall experience, likelihood to recommend, and optional open feedback.</li>
            </ul>
            <div className="mt-8 rounded-[18px] border border-blue-100 bg-white p-5 text-[13px] font-light leading-[1.75] text-gray-500">
              This form does not ask for legal names, manuscript files, payment details, private manuscript content, bank information, SSNs, medical details, or other sensitive personal information.
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 sm:p-8">
            <AuthorExperienceSurveyClient />
          </div>
        </div>
      </PageSection>
    </div>
  )
}
