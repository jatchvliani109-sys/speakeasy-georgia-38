// Contact page for SpeakBusy (Georgian).
// Route: /contact. Standalone, public, no login required.
//
// A dedicated page rather than a section inside Terms: payment providers and
// users both look for one, it can be linked directly, and it keeps the business
// identification legible without putting it on the landing page.

export default function Contact() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F4F2",
        color: "#1C1C1E",
        padding: "24px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <a
          href="/"
          style={{ color: "#5C1A2E", fontSize: 14, textDecoration: "none", fontWeight: 600 }}
        >
          ← მთავარზე დაბრუნება
        </a>

        <h1 style={{ color: "#5C1A2E", fontSize: 26, marginTop: 20, marginBottom: 6 }}>
          დაგვიკავშირდით
        </h1>
        <p style={{ color: "#4A4A4A", fontSize: 15, lineHeight: 1.7, marginTop: 0 }}>
          კითხვა, შენიშვნა ან პრობლემა? მოგვწერეთ ან დაგვირეკეთ. ვცდილობთ
          პასუხი გავცეთ სამუშაო დღეებში, 24 საათის განმავლობაში.
        </p>

        <Section title="საკონტაქტო ინფორმაცია">
          <div style={boxStyle}>
            <Row label="ელფოსტა">
              <a href="mailto:speakbusy@gmail.com" style={linkStyle}>
                speakbusy@gmail.com
              </a>
            </Row>
            <Row label="ტელეფონი">
              <a href="tel:+995551588969" style={linkStyle}>
                +995 551 58 89 69
              </a>
            </Row>
            <Row label="მისამართი">
              ქ. თბილისი, ეკა ბეჟანიშვილის ქუჩა №104
            </Row>
          </div>
        </Section>

        <Section title="სოციალური ქსელები">
          სიახლეები, ყოველდღიური რჩევები და უკუკავშირისთვის ყველაზე სწრაფი გზა:
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <a
              href="https://www.instagram.com/speakbusy/"
              target="_blank"
              rel="noopener noreferrer"
              style={socialStyle}
            >
              Instagram
            </a>
            <a
              href="https://www.tiktok.com/@speakbusy"
              target="_blank"
              rel="noopener noreferrer"
              style={socialStyle}
            >
              TikTok
            </a>
          </div>
        </Section>

        <Section title="იურიდიული ინფორმაცია">
          „SpeakBusy" არის სავაჭრო სახელწოდება. სერვისს ახორციელებს:
          <div style={boxStyle}>
            <Row label="დასახელება">ინდივიდუალური მეწარმე ნინო ჯაჭვლიანი</Row>
            <Row label="საიდენტიფიკაციო ნომერი">62009004530</Row>
            <Row label="იურიდიული მისამართი">
              ქ. თბილისი, ეკა ბეჟანიშვილის ქუჩა №104
            </Row>
          </div>
        </Section>

        <Section title="გადახდასთან დაკავშირებული საკითხები">
          თუ გადაიხადეთ და პრემიუმ წვდომა არ გააქტიურდა, ან გსურთ გამოწერის
          გაუქმება და ვერ ახერხებთ, დაგვიკავშირდით ელფოსტაზე ან ტელეფონით.
          საკითხს განვიხილავთ უმოკლეს ვადაში.
          <br />
          <br />
          გამოწერის გაუქმება ნებისმიერ დროს შესაძლებელია უშუალოდ აპლიკაციიდან,
          პრემიუმის გვერდზე. დეტალები აღწერილია{" "}
          <a href="/terms" style={linkStyle}>
            წესებსა და პირობებში
          </a>
          .
        </Section>

        <Section title="სასწავლო მასალაში შეცდომა?">
          თუ აპლიკაციაში შეამჩნიეთ არასწორი თარგმანი ან მაგალითი, გამოიყენეთ
          ღილაკი „რაღაც არასწორია?" შესაბამის სიტყვასთან. ყველა შეტყობინებას
          ვამოწმებთ.
        </Section>

        <div style={{ marginTop: 32, display: "flex", gap: 16, fontSize: 13 }}>
          <a href="/privacy" style={linkStyle}>
            კონფიდენციალობის პოლიტიკა
          </a>
          <a href="/terms" style={linkStyle}>
            წესები და პირობები
          </a>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

const boxStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E4E2DF",
  borderRadius: 10,
  padding: "6px 16px",
  margin: "12px 0",
};

const linkStyle: React.CSSProperties = {
  color: "#5C1A2E",
  fontWeight: 600,
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

const socialStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid #E4E2DF",
  background: "#FFFFFF",
  color: "#5C1A2E",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        padding: "10px 0",
        borderBottom: "1px solid #F0EEEB",
        fontSize: 14,
      }}
    >
      <span style={{ color: "#8A8A8A", minWidth: 150 }}>{label}</span>
      <span style={{ color: "#1C1C1E", fontWeight: 500 }}>{children}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ color: "#1C1C1E", fontSize: 18, marginBottom: 8 }}>{title}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.7, color: "#3A3A3A" }}>{children}</div>
    </div>
  );
}
