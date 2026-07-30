/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Head, Html, Preview } from 'npm:@react-email/components@0.0.22'

// Georgian HTML supplied by the customer, kept verbatim.
// Supabase syntax mapped: {{ .ConfirmationURL }} -> confirmationUrl (payload.data.url)
export const MagicLinkEmail = ({ confirmationUrl }: { siteName?: string; confirmationUrl: string }) => {
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F5F0;margin:0;padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#FFFFFF;border:1px solid #E4E2DF;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background-color:#5C1A2E;padding:22px 28px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#F8F5F0;letter-spacing:0.5px;">SpeakBusy</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;font-family:'Noto Sans Georgian',Arial,Helvetica,sans-serif;color:#1C1C1E;">
            <h1 style="margin:0 0 12px;font-size:20px;line-height:1.4;font-weight:bold;color:#1C1C1E;">შესვლის ბმული</h1>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#4A4A4A;">
              SpeakBusy-ში შესასვლელად დააჭირე ქვემოთ — პაროლი არ დაგჭირდება.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
              <tr>
                <td align="center" style="background-color:#C9A84C;border-radius:999px;">
                  <a href="${confirmationUrl}" style="display:inline-block;padding:14px 30px;font-family:'Noto Sans Georgian',Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#5C1A2E;text-decoration:none;">SpeakBusy-ში შესვლა</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#4A4A4A;">თუ ღილაკი არ იხსნება, დააკოპირე ეს ბმული ბრაუზერში:</p>
            <p style="margin:0 0 22px;font-size:12px;line-height:1.6;color:#5C1A2E;word-break:break-all;">${confirmationUrl}</p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8A8A;">
              ბმული ერთჯერადია. თუ შესვლა შენ არ მოგითხოვია, უბრალოდ არ მიაქციო ამ წერილს ყურადღება.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F8F5F0;padding:16px 28px;border-top:1px solid #E4E2DF;">
            <p style="margin:0;font-family:'Noto Sans Georgian',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8A8A8A;">
              SpeakBusy — ბიზნეს ინგლისური ქართველებისთვის
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
  return (
    <Html lang="ka" dir="ltr">
      <Head />
      <Preview>შესვლის ბმული — SpeakBusy</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: '#F8F5F0' }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </Body>
    </Html>
  )
}

export default MagicLinkEmail
