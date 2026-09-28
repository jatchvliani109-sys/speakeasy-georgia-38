/// <reference types="npm:@types/react@18.3.1" />

// Sent when a recurring charge is declined. Before this existed a customer
// whose card expired simply stopped being premium: three silent retries over
// six days, then access gone, with no email at any point. Both variants live
// in one template because they differ only in copy.
//
//   is_final = ""      → a retry is coming, premium still works
//   is_final = "1"     → retries are spent, premium has ended

import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Html, Preview, Section, Text, Link } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  amount?: string
  retry_date?: string
  attempt?: string
  attempts_total?: string
  is_final?: string
  profile_url?: string
  premium_url?: string
}

const PaymentFailedEmail = ({
  amount = '13.99',
  retry_date = '',
  attempt = '1',
  attempts_total = '3',
  is_final = '',
  profile_url = 'https://speakbusy.com/profile',
  premium_url = 'https://speakbusy.com/path/business/premium',
}: Props) => {
  const final = is_final === '1'
  return (
    <Html lang="ka" dir="ltr">
      <Head>
        {/* Explicit charset. Georgian characters are three bytes each in UTF-8,
            and a client that guesses the encoding will mangle them. */}
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      </Head>
      <Preview>
        {final ? 'პრემიუმი შეჩერდა · SpeakBusy' : 'გადახდა ვერ განხორციელდა · SpeakBusy'}
      </Preview>
      <Body style={body}>
        <Container style={outer}>
          <Container style={card}>
            <Section style={header}>
              <Text style={brand}>SpeakBusy</Text>
            </Section>

            <Section style={content}>
              <Text style={h1}>
                {final ? 'პრემიუმი შეჩერდა' : 'გადახდა ვერ განხორციელდა'}
              </Text>

              {final ? (
                <Text style={p}>
                  {amount} ლარის ჩამოჭრა ბარათიდან {attempts_total}-ჯერ ვცადეთ და
                  ვერ მოხერხდა, ამიტომ პრემიუმ წვდომა შეჩერებულია. შენი პროგრესი,
                  ლექსიკონი და „Streak“ ადგილზეა და არსად იკარგება.
                </Text>
              ) : (
                <Text style={p}>
                  {amount} ლარის ჩამოჭრა შენახული ბარათიდან ვერ მოხერხდა. ხშირად
                  ამის მიზეზი ბარათის ვადის გასვლა ან არასაკმარისი თანხაა.
                </Text>
              )}

              {final ? (
                <Section style={infoBox}>
                  <Text style={rowLabel}>რა შეიცვალა</Text>
                  <Text style={rowValue}>პრემიუმ ფუნქციები დროებით მიუწვდომელია</Text>
                  <Text style={{ ...rowLabel, marginTop: '10px' }}>რა დარჩა</Text>
                  <Text style={rowValue}>ლექსიკის სესიები უფასო ვერსიაში აგრძელებს მუშაობას</Text>
                </Section>
              ) : (
                <Section style={goldBox}>
                  <Text style={goldLabel}>პრემიუმი ჯერ აქტიურია</Text>
                  <Text style={goldValue}>ხელახლა ვცდით: {retry_date}</Text>
                  <Text style={goldNote}>
                    ეს {attempt}-ე მცდელობაა {attempts_total}-დან. თუ სამივე ვერ
                    გაივლის, პრემიუმი შეჩერდება.
                  </Text>
                </Section>
              )}

              <Text style={p}>
                {final
                  ? 'პრემიუმის დაბრუნება ერთი შეხებით შეგიძლია, ახალი ბარათით.'
                  : 'ბარათის შეცვლა ან გამოწერის გაუქმება პროფილის გვერდიდან შეგიძლია.'}
              </Text>

              <Section style={{ margin: '18px 0 22px' }}>
                <Link href={final ? premium_url : profile_url} style={button}>
                  {final ? 'პრემიუმის აღდგენა' : 'ბარათის განახლება'}
                </Link>
              </Section>

              <Text style={small}>თუ ღილაკი არ იხსნება, დააკოპირე ეს ბმული ბრაუზერში:</Text>
              <Text style={{ ...small, wordBreak: 'break-all' as const, marginBottom: '22px' }}>
                <Link href={final ? premium_url : profile_url} style={linkStyle}>
                  {final ? premium_url : profile_url}
                </Link>
              </Text>

              <Section style={hr} />

              <Text style={muted}>
                კითხვის შემთხვევაში დაგვიკავშირდი:{' '}
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
}

export const template = {
  component: PaymentFailedEmail,
  subject: (data: Record<string, unknown>) =>
    data?.is_final === '1'
      ? 'SpeakBusy: პრემიუმი შეჩერდა'
      : 'SpeakBusy: გადახდა ვერ განხორციელდა',
  displayName: 'გადახდა ვერ განხორციელდა',
  previewData: {
    amount: '13.99',
    retry_date: '17 ოქტომბერი, 2026',
    attempt: '1',
    attempts_total: '3',
    is_final: '',
    profile_url: 'https://speakbusy.com/profile',
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
  marginBottom: '20px',
}
const rowLabel = { margin: 0, fontSize: '13px', color: '#8A8A8A' }
const rowValue = { margin: '2px 0 0', fontSize: '15px', color: '#1C1C1E', fontWeight: 600 }
const goldBox = {
  backgroundColor: '#FBF6E8',
  border: '1px solid #E6D49A',
  borderRadius: '10px',
  padding: '16px 18px',
  marginBottom: '22px',
}
const goldLabel = {
  margin: '0 0 6px',
  fontSize: '11px',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  color: '#8A6D2F',
  fontWeight: 700,
}
const goldValue = { margin: 0, fontSize: '16px', lineHeight: 1.6, color: '#1C1C1E', fontWeight: 700 }
const goldNote = { margin: '8px 0 0', fontSize: '13px', lineHeight: 1.7, color: '#4A4A4A' }
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