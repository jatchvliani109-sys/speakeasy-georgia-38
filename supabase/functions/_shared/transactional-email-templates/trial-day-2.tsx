/// <reference types="npm:@types/react@18.3.1" />

// Trial reminder, day 2.
//
// The problem this solves: SpeakBusy is a website, not an app, so nothing
// reminds anyone to come back. People accept the trial, use it once, and then
// forget it exists until it has expired.
//
// Consent: the gift screen states that reminders will be sent during the trial,
// so accepting the gift is the consent. An unsubscribe link is included anyway,
// because these sit closer to marketing than a payment receipt does.

import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Html, Preview, Section, Text, Link } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  words_started?: string
  percent?: string
  days_left?: string
  app_url?: string
}

const TrialDay2Email = ({
  words_started = '0',
  percent = '0',
  days_left = '5',
  app_url = 'https://speakbusy.com/path/business/vocabulary',
}: Props) => (
  <Html lang="ka" dir="ltr">
    <Head>
      <meta charSet="utf-8" />
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
    </Head>
    <Preview>შენი პროგრესი SpeakBusy-ზე</Preview>
    <Body style={body}>
      <Container style={outer}>
        <Container style={card}>
          <Section style={header}>
            <Text style={brand}>SpeakBusy</Text>
          </Section>

          <Section style={content}>
            <Text style={h1}>კარგი დასაწყისია</Text>

            <Text style={p}>
              პრემიუმის საცდელი პერიოდი მიმდინარეობს. აი, სად ხარ ახლა:
            </Text>

            <Section style={infoBox}>
              <Text style={statValue}>{words_started}</Text>
              <Text style={statLabel}>სიტყვა დაიწყე</Text>
              <Text style={{ ...statValue, marginTop: '14px' }}>{percent}%</Text>
              <Text style={statLabel}>ლექსიკა დაფარულია</Text>
            </Section>

            <Text style={p}>
              დღეში ხუთი წუთი საკმარისია. მთავარია, რიტმი არ დაიკარგოს, რადგან
              სიტყვა მყარად მაშინ ილექება, როცა რამდენიმე სხვადასხვა დღეს
              გაიმეორებ.
            </Text>

            <Text style={p}>
              საცდელ პერიოდს <b>{days_left} დღე</b> დარჩა.
            </Text>

            <Section style={{ margin: '18px 0 22px' }}>
              <Link href={app_url} style={button}>
                დღევანდელი სესია
              </Link>
            </Section>

          </Section>

          <Section style={footer}>
            <Text style={footerText}>SpeakBusy · ბიზნეს ინგლისური ქართველებისთვის</Text>
          </Section>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TrialDay2Email,
  subject: 'SpeakBusy: კარგი დასაწყისია',
  displayName: 'საცდელი პერიოდი, მე-2 დღე',
  previewData: {
    words_started: '24',
    percent: '1.8',
    days_left: '5',
    app_url: 'https://speakbusy.com/path/business/vocabulary',
  },
} satisfies TemplateEntry

const body = {
  margin: 0,
  padding: '24px 12px',
  backgroundColor: '#ffffff',
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
}
const outer = { backgroundColor: '#F0EEEB', padding: '16px 8px', borderRadius: '16px' }
const card = { maxWidth: '560px', backgroundColor: '#FFFFFF', borderRadius: '14px', overflow: 'hidden' as const, padding: 0 }
const header = { backgroundColor: '#5C1A2E', padding: '26px 32px' }
const brand = { margin: 0, color: '#FFFFFF', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.2px' }
const content = { padding: '32px' }
const h1 = { margin: '0 0 14px', fontSize: '20px', lineHeight: 1.4, color: '#1C1C1E', fontWeight: 700 }
const p = { margin: '0 0 20px', fontSize: '15px', lineHeight: 1.75, color: '#3A3A3A' }
const infoBox = {
  backgroundColor: '#F8F5F0',
  border: '1px solid #E4E2DF',
  borderRadius: '10px',
  padding: '18px',
  marginBottom: '20px',
  textAlign: 'center' as const,
}
const statValue = { margin: 0, fontSize: '28px', lineHeight: 1.2, color: '#5C1A2E', fontWeight: 700 }
const statLabel = { margin: '2px 0 0', fontSize: '12px', color: '#8A8A8A' }
const button = {
  backgroundColor: '#C9A84C',
  borderRadius: '26px',
  display: 'inline-block',
  padding: '14px 30px',
  fontSize: '15px',
  fontWeight: 700,
  color: '#1C1C1E',
  textDecoration: 'none',
}
const linkStyle = { color: '#5C1A2E' }
const hr = { borderTop: '1px solid #E4E2DF', margin: '0 0 18px' }
const muted = { margin: 0, fontSize: '12px', lineHeight: 1.75, color: '#8A8A8A' }
const footer = { padding: '18px 32px', borderTop: '1px solid #E4E2DF' }
const footerText = { margin: 0, fontSize: '12px', color: '#8A8A8A' }
