# DocDeck

Turn a Google Docs PDF into a Google Slides deck in seconds. DocDeck reads the
document's structure, picks a template that fits its subject, and builds the
slides in your browser. Nothing is uploaded to a server.

## How it works

1. **Read.** [pdf.js](https://mozilla.github.io/pdf.js/) extracts every line of
   text with its font size, weight and position.
2. **Find structure.** The most common font size is body text. Larger sizes
   become headings (ranked by size), bold one-line paragraphs become minor
   headings, and bullet glyphs or indented lines become list items. The largest
   heading on page 1 is the title; a short line right under it is the subtitle.
   Running headers, footers and page numbers are dropped.
3. **Pick a template.** Every word is scored against eight subject vocabularies
   (business, technology, science, education, health, creative, environment,
   law and policy). Titles count 4×, headings 2×. The top subject wins; weak
   matches fall back to the neutral template. The page shows the score and the
   words that decided it, and you can switch templates with one click.
4. **Build slides.**
   - Title slide, then an agenda when there are 3+ sections
   - Top-level headings become section dividers when they have subsections
   - Paragraphs are condensed to their key sentences; lists become bullets
   - "Label: text" lines get a bold lead-in
   - 2–4 points that each carry a figure ($, %, 41,000) become big-number cards
   - A single short point becomes a statement slide; a quoted paragraph a quote slide
   - Long sections continue onto extra slides; short lists go two-column
   - The full original text of each section goes into the speaker notes
5. **Export.** [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) writes a
   widescreen `.pptx`. Text sizes are measured with the real fonts, so the
   preview and the export match. All fonts are Google Fonts, so they render
   exactly in Google Slides.

## AI design

Before the preview appears, Claude redesigns the whole deck:

- rewrites the document as slide copy, with titles that state the point and short bullets
- picks a layout for each slide: section dividers, bullets, big-number stats,
  cards, numbered steps or a timeline, two-sided comparisons, quotes and key
  statements
- picks the template that fits the subject and says why
- writes speaker notes for every slide from the document

With **Let AI expand on topics** on (the default), Claude may add a little
widely accepted context where a topic is thin: a definition, background, an
example or a common practice, up to 4 extra slides. It never adds statistics,
quotes, names or claims about your own organization. Every slide with added
material is marked **AI added** in the app, and its speaker notes start with
"Added by AI: …" saying what was added, so you can check it before presenting.
With the option off, Claude uses only what the document says.

A design usually takes 20 to 60 seconds.
**Skip AI** uses the quick layout instead, and **Redesign with AI** asks for a
fresh version. If AI design is unavailable or fails, the page falls back to the
quick layout and says why.

Where Claude runs depends on where the page is hosted:

- **On claude.ai** (the published artifact): the page asks Claude directly with
  the viewer's own Claude account. Nothing to set up.
- **On your own site, for yourself** (GitHub Pages): paste your Anthropic API
  key into the box under **Design with AI**. It is kept only in that browser
  and sent only to Anthropic, and designs are billed to your Anthropic account.
  Anyone else visiting your site needs their own key, or the server below.
- **On your own site, for every visitor**: the page calls the small server in
  [`worker/`](worker/), a Cloudflare Worker that holds your Anthropic API key
  and calls Claude Opus 5.5. The key never reaches visitors' browsers, and the
  Worker only accepts requests from your site.

### Deploy the AI server (Cloudflare Workers, free tier)

You need an [Anthropic API key](https://console.anthropic.com/) and a free
[Cloudflare account](https://dash.cloudflare.com/sign-up). Each design is
billed to your Anthropic account.

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

`wrangler deploy` prints the Worker's address, for example
`https://docdeck-ai.yourname.workers.dev`. Put it in `AI_ENDPOINT` near the top
of the script in `app.html`, run `./build.sh`, and push. If you move the site to
a custom domain, change `ALLOWED_ORIGIN` in `worker/wrangler.toml` and deploy
again.

The design rules live in two places that must stay identical: `DESIGN_RULES`
in `app.html` (used on claude.ai) and in `worker/src/index.ts`.

## Quick layout (no AI)

Headings are found from Google Docs heading styles, larger or bold text, and
titles typed as plain lines (short lines that start a new block, ALL CAPS lines,
and short lines ending in a colon).

The rule-based steps in [How it works](#how-it-works) run first on every
document (reading the PDF, finding its structure, scoring the subject). On their
own they produce the quick layout, which is used when AI design is off or
unavailable.

## Templates

| Template | Used for | Type |
|---|---|---|
| Boardroom | Business & finance | Montserrat / Lato |
| Circuit | Technology & software | Space Grotesk / Inter / Roboto Mono |
| Lab Notebook | Science & research | Roboto Slab / Roboto |
| Classroom | Education & learning | Nunito |
| Clinic | Health & wellbeing | Poppins / Open Sans |
| Studio | Marketing & creative | Playfair Display / Raleway |
| Field Guide | Environment & sustainability | Lora / Lato |
| Charter | Law, policy & government | Merriweather / Libre Franklin |
| Clean Slate | Anything else | Inter |

To add a template, add an entry to `THEMES` and a word list to `LEX` in `app.html`.

## Files

- `app.html`: the whole app (HTML, CSS and JS in one file). Edit this one.
- `build.sh`: wraps `app.html` into a complete `index.html` for hosting.
- `index.html`: the built page. Upload this to any static host.
- `worker/`: the optional AI server for self-hosted copies (Cloudflare Worker).

```bash
./build.sh
```

## Hosting

`index.html` is a static page. Put it on GitHub Pages, Netlify, Vercel,
Cloudflare Pages or any web server. To try it locally:

```bash
python3 -m http.server 8000
```

## One-click "Create in Google Slides" (optional)

Without setup, **Open in Google Slides** shows a three-step import: download the
`.pptx`, upload it to Google Drive, then choose File → Save as Google Slides.

To create the deck directly in the user's Drive with one click:

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project.
2. Enable the **Google Drive API** (APIs & Services → Library).
3. Configure the **OAuth consent screen**. Add the scope
   `https://www.googleapis.com/auth/drive.file` (it only lets DocDeck see files
   it creates).
4. Create an **OAuth client ID** of type *Web application*. Under
   *Authorized JavaScript origins*, add your site's origin, for example
   `https://yourname.github.io` (and `http://localhost:8000` for testing).
5. Put the client ID in `GOOGLE_CLIENT_ID` near the top of the script in
   `app.html` and run `./build.sh`. Or paste it into the page's
   *Set up one-click export* box, which saves it in that browser only.

The button then reads **Create in Google Slides**. It signs the user in with
Google, uploads the generated deck to Drive with conversion to Google Slides
format, and opens the new presentation.

## Limits

- PDFs must contain real text. Scanned documents need OCR first.
- Images and tables in the document are not carried over yet.
- The quick layout reuses your own sentences. AI design rewrites them as slide
  copy but is told never to add facts that are not in the document. Check
  numbers before presenting.
