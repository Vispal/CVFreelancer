# Jussi Virta Personal CV Website

A minimal static CV / personal website built with plain HTML and CSS.

## Project structure

- `index.html` – front page (jussivirta.fi/) with two choices: Digipalvelut and CV
- `CV/` – CV page (jussivirta.fi/CV/): `index.html` and `styles.css`
- `digipalvelut/` – digital services page for small businesses (jussivirta.fi/digipalvelut/), with its privacy page and brochure PDF. It links to the single CV at `assets/Jussi_Virta_CV.pdf`. Its `index.html` is generated in a separate project; edit the content there and copy the built file here.
- `fontit/` – Atkinson Hyperlegible and Caveat (OFL) used by the front page, and Archivo (OFL) used by the CV page. No external font services are used.
- `assets/` – images and downloadable PDFs
- `_redirects` – Cloudflare Pages redirects: /cv to /CV/ and the retired /freelance/ page to /digipalvelut/
- `doodle/` – the front page's "mysterious drawer": after a few seconds a red pencil sketches small doodles on the grid paper (desktop with a mouse only, off with reduced motion). `shapes.js` holds the doodles, `doodle.js` draws them. No cookies, storage or network requests
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
