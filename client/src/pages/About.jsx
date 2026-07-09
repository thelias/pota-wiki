import { Link } from 'react-router-dom'
import Nav from '../components/Nav.jsx'

export default function About() {
  return (
    <>
      <Nav crumb="About" />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 6 }}>About POTA Wiki</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: 40 }}>
          The purpose of POTA Wiki is to provide a place for activators to share information and data on the parks they activate not readily available from other channels.
          <br />
          <br />
          If you are looking for information on how to activate a park, please refer to the <a href="https://docs.pota.app/">official POTA website</a>
          <br />
          <br />
          This site is not officially associated with POTA. It is developed independently by me, KK7KKT, utilizing their public endpoints.
        </p>

        <Section title="About This Site">
          Full transparency is important in development. This site was built utilizing AI to write code, specifically Claude. That being said, I have been a professional software engineer and enterprise software architect for 13 years. I have maintained the old school process of code review, and heavy oversight of the models utilized in order to ensure best practices.
          <br />
          <br />
          Though I believe AI to be an excellent tool if used responsibly with oversight and knowledge, I am opposed to its use in any form of communication between individuals or "art" (including the words on this page). <br /> <br /> With that in mind: <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}><li> Any logo or art used on this site has either been created by a person specifically for this site, or used with appropriate permission.</li> <li>Any communication you have with me, will be me or an automated response stating that I will get in touch with you soon.</li></ul>
        </Section>

        <Section title="How to Use This Wiki">
          Simply search for the park you want more information on and see what other activators have to say about it.
          <br/>
          <br/>
          If you want to submit an activation report: make an account, find your park and fill out the activation report form.
        </Section>

        <Section title="Contact & Credits">
          The logo and artwork for this site was done by my lovely and incredibly talented wife, Elise.
          <br/>
          <br/>
          This site is developed and maintained by me: Elias (KK7KKT). Feel free to look me up on QRZ to get a hold of me.
          <br/>
          <br/>
          Special thanks to both Eric (KJ7XJ) and Paul (W7PFB) for their feedback on this site and general elmer-ness in my radio journey. 
        </Section>

      </div>

      <footer>
        Park data from <a href="https://pota.app" target="_blank" rel="noreferrer">Parks on the Air®</a>
      </footer>
    </>
  )
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--green-light)' }}>
        {title}
      </h2>
      <div style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text)' }}>
        {children || (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Content coming soon.</p>
        )}
      </div>
    </section>
  )
}
