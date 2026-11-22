# NVMe Monitor website

Static source for nvmemonitor.app. The site provides an overview, compatibility and support information, the privacy policy, and a downloadable press kit.

## Local preview

Run `node build.mjs` after editing the site templates or a catalog in `i18n/`. The build validates all 17 catalogs and refreshes the four pages per language and the multilingual sitemap. Commit the regenerated files in `public/` along with their source.

Run `python3 -m http.server --directory public 8000` and open http://localhost:8000. English is at the root. The other languages have their own URL prefixes, including right-to-left Arabic.

Appearance and temperature-unit choices are stored in the visitor’s browser. The Celsius and Fahrenheit previews show the same measurement rendered by the native app with neutral drive identification.

## Hosting

Connect this repository’s `main` branch in Cloudflare Pages. Use the `public` output directory with no build command. Attach `nvmemonitor.app` as a custom domain. The public support address is configured through the domain’s mail provider.

The Search Console domain property should use DNS ownership verification. Submit `https://nvmemonitor.app/sitemap.xml` once verification completes.
