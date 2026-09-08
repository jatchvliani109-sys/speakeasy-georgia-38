/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Html, Preview, Section, Text, Link } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  period_end_date?: string
  premium_url?: string
}

const CancellationEmail = ({
  period_end_date = '',
  premium_url = 'https://speakbusy.com/path/business/premium',
}: Props) => (
  <Html lang="ka" dir="ltr">
    <Head />
    <Preview>გამოწერა გაუქმებულია — SpeakBusy</Preview>
    <Body style={body}>
      <Container style={outer}>
        <Container style={card}>
          <Section style={header}>
            <Text style={brand}>SpeakBusy</Text>
          </Section>

          <Section style={content}>
            <Text style={h1}>გამოწერა გაუქმებულია</Text>

            <Text style={p}>
              დავადასტურეთ შენი გამოწერის გაუქმება. ავტომატური გადახდა
              შეწყდა და ბარათიდან თანხა აღარ ჩამოიჭრება.
            </Text>

            <Section style={infoBox}>
              <Text style={boxLabel}>პრემიუმი აქტიურია</Text>
              <Text style={boxValue}>{period_end_date}-მდე</Text>
              <Text style={boxNote}>
                უკვე გადახდილი პერიოდი სრულად შენია. ამის შემდეგ
                ავტომატურად გადახვალ უფასო ვერსიაზე.
              </Text>
            </Section>

            <Text style={p}>
              შენი პროგრესი არსად წასულა. ნასწავლი სიტყვები, ლექსიკონი და
              Streak შენთან რჩება, უფასო ვერსიაშიც.
            </Text>

            <Section style={{ margin: '0 0 22px' }}>
              <Link href={premium_url} style={button}>
                გამოწერის განახლება
              </Link>
            </Section>

            <Text style={small}>თუ ღილაკი არ იხსნება, დააკოპირე ეს ბმული ბრაუზერში:</Text>
            <Text style={{ ...small, wordBreak: 'break-all' as const, marginBottom: '22px' }}>
              <Link href={premium_url} style={linkStyle}>{premium_url}</Link>
            </Text>

            <Section style={hr} />

            <Text style={muted}>
              თუ ეს გაუქმება შენ არ გაგიკეთებია, დაგვიკავშირდი დაუყოვნებლივ:{' '}
              <Link href="mailto:speakbusy@gmail.com" style={linkStyle}>speakbusy@gmail.com</Link>
              {' '}ან +995 551 58 89 69
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
  component: CancellationEmail,
  subject: 'SpeakBusy — გამოწერა გაუქმებულია',
  displayName: 'გაუქმების დადასტურება',
  previewData: {
    period_end_date: '15 ოქტომბერი, 2026',
    premium_url: 'https://speakbusy.com/path/business/premium',
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
  padding: '16px 18px',
  marginBottom: '22px',
}
const boxLabel = {
  margin: '0 0 6px',
  fontSize: '11px',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  color: '#8A8A8A',
  fontWeight: 700,
}
const boxValue = { margin: 0, fontSize: '16px', lineHeight: 1.6, color: '#1C1C1E', fontWeight: 700 }
const boxNote = { margin: '8px 0 0', fontSize: '13px', lineHeight: 1.7, color: '#4A4A4A' }
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
const small = { margin: '0 0 6px', fontSize: '13px', lineHeight: 1.7, color: '#4A4A4A' }
const linkStyle = { color: '#5C1A2E' }
const hr = { borderTop: '1px solid #E4E2DF', margin: '0 0 18px' }
const muted = { margin: 0, fontSize: '13px', lineHeight: 1.75, color: '#8A8A8A' }
const footer = { padding: '18px 32px', borderTop: '1px solid #E4E2DF' }
const footerText = { margin: 0, fontSize: '12px', color: '#8A8A8A' }
