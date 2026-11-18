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
- Summaries are extractive (the most informative sentences, trimmed), not
  rewritten. The full text is always in the speaker notes.
