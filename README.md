# Jussi Virta Personal CV Website

A minimal static CV / personal website built with plain HTML and CSS.

## Project structure

- `index.html` – front page (jussivirta.fi/) with two choices: Digipalvelut and CV
- `CV/` – CV page (jussivirta.fi/CV/): `index.html` and `styles.css`
- `digipalvelut/` – digital services page for small businesses (jussivirta.fi/digipalvelut/), with its privacy page and brochure PDF. It links to the single CV at `assets/Jussi_Virta_CV.pdf`. Its `index.html` is generated in a separate project; edit the content there and copy the built file here.
- `fontit/` – Atkinson Hyperlegible and Caveat (OFL) used by the front page, and Archivo (OFL) used by the CV page. No external font services are used.
- `assets/` – images and downloadable PDFs
- `_redirects` – Cloudflare Pages redirects: /cv to /CV/ and the retired /freelance/ page to /digipalvelut/
- `doodle/` – the front page's "mysterious drawer": after a few seconds a pencil sketches small black doodles on the grid paper (desktop with a mouse only, off with reduced motion). Visitors can draw too, in black, everywhere except over the two cards; a footer hint with "pyyhi" (erase) and "hiljaa" (stop the drawer) buttons is built in but hidden for now (`ohjaimet: false` in `doodle.js`). When a visitor pauses after drawing, the drawer answers by drawing around it (a face or a balloon string on a circle, a snail on a line, a sun and trees on a long flat line, a paper boat on a wavy line, a frame around a bigger drawing, a small copy next to a star or heart, "10/10" next to a scribble, a rolling ball and "jeee!" on a downhill line, a climber and a flag on an uphill line, a flower on a vertical line, a dashed treasure path to an X, a snowcapped mountain from a triangle, a present from a rectangle, a target where an arrow points, and so on). `shapes.js` holds the doodles and words, `vastaukset.js` picks the answers, `doodle.js` draws everything, `kyna.svg` is the pen cursor. No cookies, storage or network requests
- `_headers` – security headers (CSP, HSTS, frame and referrer policy). The CSP allows scripts from `https://jussivirta.fi/cdn-cgi/scripts/`, so that Cloudflare Email Address Obfuscation can decode the email addresses. Only the front page (`/`) also allows the site's own scripts (`'self'`) for `doodle/`; the other pages have no JavaScript of their own
- `robots.txt`, `sitemap.xml` – search engine files; update `sitemap.xml` when pages are added

## Local preview

Serve the folder with a simple local static server.

## Deployment

This project is deployed to Cloudflare Pages through its GitHub integration
(connected in November 2026; before that the site was uploaded by hand).
Every push to `main` is deployed from the project root without a build step:
no framework preset, no build command, build output directory `/`.

## Notes

- No framework or build step is required.
- The structure is intentionally simple and easy to maintain.
- Content is kept separate from presentation.
