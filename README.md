# NVMe Monitor website

Static source for nvmemonitor.app. The site provides an overview, compatibility and support information, the privacy policy, and a downloadable press kit.

## Local preview

Run `node build.mjs` after editing the site templates or a catalog in `i18n/`. The build validates all 17 catalogs and refreshes the four pages per language and the multilingual sitemap. Commit the regenerated files in `public/` along with their source.

Run `python3 -m http.server --directory public 8000` and open http://localhost:8000. English is at the root. The other languages have their own URL prefixes, including right-to-left Arabic.

Appearance and temperature-unit choices are stored in the visitor’s browser. The Celsius and Fahrenheit previews show the same measurement rendered by the native app with neutral drive identification.

To review the Workbench layout with the original Apple badges while keeping the
pre-release output in `public/` intact, build to a separate local directory.
Point `NVME_APPLE_BADGES_DIR` at the original badge files described below.

```sh
NVME_PREVIEW_DIR="$PWD/../workbench-preview" \
  NVME_APPLE_BADGES_DIR="/path/to/original/apple/badges" \
  node build.mjs --published-store
python3 -m http.server --bind 127.0.0.1 --directory ../workbench-preview 8741
```

Open http://127.0.0.1:8741 to view the isolated preview.

## Hosting

Connect this repository’s `main` branch in Cloudflare Pages. Use the `public` output directory with no build command. Attach `nvmemonitor.app` as a custom domain. The public support address is configured through the domain’s mail provider.

The Search Console domain property should use DNS ownership verification. Submit `https://nvmemonitor.app/sitemap.xml` once verification completes.

## Mac App Store release

The default build uses a text link to the product page before release. After the app is available to download, point `NVME_APPLE_BADGES_DIR` at the unmodified Apple Marketing Kit SVGs named `badge-mac-black-<locale>.svg` and run `node build.mjs --published-store`. The build preserves the native badge aspect ratios and uses the English artwork for any locale without a Mac badge. Publish that build once the App Store product page is live.
