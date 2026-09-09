/// <reference types="npm:@types/react@18.3.1" />

// Trial ended.
//
// The conversion moment. Leads with what they ACHIEVED rather than what they
// have lost: "your trial ended, pay now" reads as a toll gate, while the same
// offer after their own numbers reads as keeping something they built.
//
// It also says plainly that nothing is lost. Manufacturing a sense of loss
// produces resentment, not subscriptions, and the honest version is more
// persuasive because it is true.
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

const TrialEndedEmail = ({
  words_started = '0',
  percent = '0',
  days_left = '5',
  app_url = 'https://speakbusy.com/path/business/premium',
}: Props) => (
  <Html lang="ka" dir="ltr">
    <Head>
      <meta charSet="utf-8" />
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
    </Head>
    <Preview>საცდელი პერიოდი დასრულდა</Preview>
    <Body style={body}>
      <Container style={outer}>
        <Container style={card}>
          <Section style={header}>
            <Text style={brand}>SpeakBusy</Text>
          </Section>

          <Section style={content}>
            <Text style={h1}>7 დღე დასრულდა</Text>

            <Text style={p}>
              საცდელი პერიოდი დასრულდა. აი, რა გააკეთე ამ 7 დღეში:
            </Text>

            <Section style={infoBox}>
              <Text style={statValue}>{words_started}</Text>
              <Text style={statLabel}>სიტყვა დაიწყე</Text>
              <Text style={{ ...statValue, marginTop: '14px' }}>{percent}%</Text>
              <Text style={statLabel}>ლექსიკა დაფარულია</Text>
            </Section>

            <Text style={p}>
              <b>შენი პროგრესი არსად წასულა.</b> ყველა ნასწავლი სიტყვა,
              ლექსიკონი და Streak შენთან რჩება. უფასო ვერსიით აგრძელებ
              ყოველდღიურ სესიებს.
            </Text>

            <Text style={p}>
              თუ გინდა ულიმიტო სესიები, გასაუბრების სიმულაცია და კვირაში
              7 AI სესია, პრემიუმი 13.99 ლარია თვეში.
            </Text>

            <Section style={{ margin: '18px 0 22px' }}>
              <Link href={app_url} style={button}>
                პრემიუმის ნახვა
              </Link>
            </Section>

            <Section style={hr} />

            <Text style={muted}>
              აღარ გინდა ასეთი შეტყობინებები?{' '}
              <Link href={unsubscribe_url} style={linkStyle}>გამოწერის გაუქმება</Link>
            </Text>
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
  component: TrialEndedEmail,
  subject: 'SpeakBusy: საცდელი პერიოდი დასრულდა',
  displayName: 'საცდელი პერიოდი დასრულდა',
  previewData: {
    words_started: '112',
    percent: '7.4',
    days_left: '5',
    app_url: 'https://speakbusy.com/path/business/premium',
    unsubscribe_url: 'https://speakbusy.com/unsubscribe?token=preview',
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
