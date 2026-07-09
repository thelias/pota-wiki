# POTA Wiki — User Guide

POTA Wiki is a community knowledge base for Parks on the Air activators. It collects on-the-ground experience from activators — cell service, parking, busyness, setup spots — and surfaces it as useful data for anyone planning an activation.

---

## Browsing Parks

The home page lists parks across the US. You can find a park three ways:

- **Search** — type a park name or reference number (e.g. `K-0813`) into the search bar
- **Filter by state** — use the state dropdown to narrow to a specific location
- **Near me** — click "Near me" to sort parks by proximity to your current location

Each park card shows the park name, reference, state, and how many activation reports have been submitted on POTA Wiki.

---

## Park Pages

Click any park to open its detail page. The page has three sections:

### Park Info
The top card shows the park's location on a map, POTA stats (total activations, attempts, and QSOs), and metadata like grid square, managing agency, access method, and first activator. Links to the official POTA park page, the state park website (if available), and Google Maps are included.

### Activator Insights
Once a park has at least 2 activation reports, an **Activator Insights** panel appears above the reports. This aggregates what activators have reported and shows:

- **Cell Service** — whether most activators reported getting a signal, and from which carrier
- **Bathrooms** — whether facilities were present
- **QRM Level** — the range of radio interference reported, with the average
- **Parking** — the most commonly reported parking situation (Good / Okay / Bad)
- **Busyness patterns** — when the park tends to be crowded or quiet, based on time of day and weekday vs. weekend data

The insights panel only shows data categories that have enough reports to be meaningful.

### Activation Reports
Individual reports submitted by activators are listed newest first, 10 per page. Each report can include:

- Activation date and callsign
- Cell service (yes/no/unknown) and carrier
- Bathrooms (yes/no/unknown)
- Parking availability (Good / Okay / Bad)
- Park busyness (Quiet / Moderate / Busy) and time of day
- QRM level (Very Low → Very High)
- Mode(s) and bands used, power in watts
- Antenna description
- Free-text notes on parking, setup locations, and general comments
- Photos

Clicking an activator's callsign takes you to their public profile page.

---

## Submitting an Activation Report

You must have an account to submit a report. Your POTA callsign is used for your account, so you must have an active POTA profile to register.

### Creating an Account
Go to **Log in → Sign up**. Enter your callsign, email, and a password (8+ characters). Your callsign is verified against the POTA database during signup.

### Submitting a Report
Navigate to the park you activated and scroll to the **Submit Activation Report** form at the bottom of the page. Fill in as many fields as apply — only the activation date is required.

After submitting, your report appears at the top of the list and is immediately factored into the Activator Insights panel.

### Editing a Report
On any report you submitted, an **Edit** button appears next to Delete. Clicking it loads your report's data back into the form. You can change any field, add new photos, or remove existing ones. Save when done.

### Deleting a Report
Click **Delete** on your own report. You'll be asked to confirm. Deleted reports are removed permanently and no longer count toward the Activator Insights summary.

---

## Your Profile

Click your callsign in the top navigation to open your profile page. It has two tabs:

- **My Reports** — a paginated list of every report you've submitted, sorted by activation date. Click any row to go to that park page.
- **Settings** — shows your callsign (not changeable) and email address.

---

## Public Profiles

Clicking any activator's callsign in a report takes you to their public profile. It shows all of their submitted reports, paginated 10 per page. Public profiles do not show email or account settings.

---

## Top Contributors

The **Contributors** tab on the home page shows the top 10 activators by number of reports submitted to POTA Wiki. Only users with at least one report appear on the leaderboard.

---

## Password Reset

On the login page, click **Forgot password?** and enter your account email. If an account exists with that email, a reset link will be sent (valid for 1 hour). Click the link in the email, enter a new password, and you'll be redirected to log in.

---

## Reporting Bugs

Found something broken? Use the **Report a bug** link in the footer on any page — it opens a GitHub issue form. Describe what happened, what you expected, and (if possible) the park or page where you saw the problem.

---

## A Note on Data

POTA Wiki is not affiliated with Parks on the Air. Park data (names, references, stats, locations) is sourced from the public POTA API. Activation reports on this site are community-contributed and independent of the official POTA log.
