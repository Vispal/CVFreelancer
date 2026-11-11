# Jussi Virta Personal CV Website

A minimal static CV / personal website built with plain HTML and CSS.

## Project structure

- `index.html` – front page (jussivirta.fi/) with two choices: Digipalvelut and CV
- `CV/` – CV page (jussivirta.fi/CV/): `index.html` and `styles.css`
- `digipalvelut/` – digital services page for small businesses (jussivirta.fi/digipalvelut/), with its privacy page and PDFs. Its `index.html` is generated in a separate project; edit the content there and copy the built file here.
- `freelance/` – earlier freelance page (jussivirta.fi/freelance/)
- `fontit/` – Atkinson Hyperlegible and Caveat (OFL) used by the front page
- `assets/` – images and downloadable PDFs
- `_redirects` – Cloudflare Pages redirect from /cv to /CV/

## Local preview

Serve the folder with a simple local static server.

## Deployment

This project is deployed to Cloudflare Pages through its GitHub integration.
The `main` branch is deployed from the project root without a build step.

## Notes

- No framework or build step is required.
- The structure is intentionally simple and easy to maintain.
- Content is kept separate from presentation.
