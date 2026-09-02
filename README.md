# Jussi Virta Personal CV Website

A minimal static CV / personal website built with plain HTML and CSS.

## Project structure

- `index.html` – page content and semantic HTML structure
- `styles.css` – all styling and layout
- `assets/` – images and downloadable PDF

## Local preview

Open `index.html` in a browser, or serve the folder with a simple local static server.

## Deployment

This project is deployed to Cloudflare Pages.

Example:

```bash
npx wrangler@latest pages deploy . --project-name=jussivirta --branch main --commit-dirty=true
```

## Notes

- No framework or build step is required.
- The structure is intentionally simple and easy to maintain.
- Content is kept separate from presentation.
