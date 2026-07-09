import Nav from '../components/Nav.jsx'
import Footer from '../components/Footer.jsx'

export default function Help() {
  return (
    <>
      <Nav crumb="Help" />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 6 }}>How POTA Wiki Works</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: 40 }}>
          POTA Wiki is a community knowledge base for Parks on the Air activators. It collects on-the-ground experience — cell service, parking, busyness, setup spots — and surfaces it as useful data for anyone planning an activation.
        </p>

        <Section title="Browsing Parks">
          The home page lists parks across the US. You can find a park three ways:
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: 1.8 }}>
            <li><strong>Search</strong> — type a park name or reference number (e.g. K-0813) into the search bar</li>
            <li><strong>Filter by state</strong> — use the state dropdown to narrow to a specific location</li>
            <li><strong>Near me</strong> — click "Near me" to sort parks by proximity to your current location</li>
          </ul>
          <br />
          Each park card shows the park name, reference, state, and how many activation reports have been submitted on POTA Wiki.
        </Section>

        <Section title="Park Pages">
          Click any park to open its detail page. The page has three sections:
          <br /><br />
          <strong>Park Info</strong> — the top card shows the park's location on a map, POTA stats (total activations, attempts, and QSOs), and metadata like grid square, managing agency, access method, and first activator. Links to the official POTA park page, the state park website (if available), and Google Maps are included.
          <br /><br />
          <strong>Activator Insights</strong> — once a park has at least 2 activation reports, an insights panel appears above the reports. This aggregates what activators have reported and shows cell service, bathroom availability, QRM level range, parking availability, and when the park tends to be busy or quiet based on time of day and weekday vs. weekend patterns.
          <br /><br />
          <strong>Activation Reports</strong> — individual reports submitted by activators, listed newest first, 10 per page. Clicking an activator's callsign takes you to their public profile.
        </Section>

        <Section title="Submitting an Activation Report">
          You must have an account to submit a report. Your POTA callsign is used for your account, so you must have an active POTA profile to register.
          <br /><br />
          To create an account, go to <strong>Log in → Sign up</strong>. Enter your callsign, email, and a password (8+ characters). Your callsign is verified against the POTA database during signup.
          <br /><br />
          To submit a report, navigate to the park you activated and scroll to the <strong>Submit Activation Report</strong> form at the bottom of the page. Only the activation date is required — fill in as many other fields as apply. After submitting, your report appears at the top of the list and is immediately included in the Activator Insights panel.
        </Section>

        <Section title="Editing and Deleting Reports">
          On any report you submitted, an <strong>Edit</strong> button appears next to Delete. Clicking it loads your report's data back into the form — you can change any field, add new photos, or remove existing ones.
          <br /><br />
          Clicking <strong>Delete</strong> removes the report permanently after a confirmation prompt. Deleted reports no longer count toward the Activator Insights summary.
        </Section>

        <Section title="Your Profile">
          Click your callsign in the top navigation to open your profile page. It has two tabs:
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: 1.8 }}>
            <li><strong>My Reports</strong> — a paginated list of every report you've submitted, sorted by activation date. Click any row to go to that park page.</li>
            <li><strong>Settings</strong> — shows your callsign (not changeable) and email address.</li>
          </ul>
        </Section>

        <Section title="Public Profiles">
          Clicking any activator's callsign in a report takes you to their public profile. It shows all of their submitted reports, paginated 10 per page. Public profiles do not show email or account settings.
        </Section>

        <Section title="Top Contributors">
          The <strong>Contributors</strong> tab on the home page shows the top 10 activators by number of reports submitted to POTA Wiki.
        </Section>

        <Section title="Password Reset">
          On the login page, click <strong>Forgot password?</strong> and enter your account email. If an account exists with that email, a reset link will be sent (valid for 1 hour). Click the link in the email, enter a new password, and you'll be redirected to log in.
        </Section>

        <Section title="A Note on Data">
          POTA Wiki is not affiliated with Parks on the Air. Park data (names, references, stats, locations) is sourced from the public POTA API. Activation reports on this site are community-contributed and independent of the official POTA log.
        </Section>

      </div>

      <Footer />
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
        {children}
      </div>
    </section>
  )
}
