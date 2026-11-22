# NVMe Monitor website

Static source for nvmemonitor.app. The site provides an overview, compatibility and support information, and the privacy policy.

## Local preview

Run `python3 -m http.server --directory public 8000` and open http://localhost:8000.

## Hosting

Connect this repository’s `main` branch in Cloudflare Pages. Use the `public` output directory with no build command. Attach `nvmemonitor.app` as a custom domain. The public support address is configured through the domain’s mail provider.

The Search Console domain property should use DNS ownership verification. Submit `https://nvmemonitor.app/sitemap.xml` once verification completes.
