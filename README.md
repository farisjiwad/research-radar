# Research Radar

A public, static research-discovery app for GitHub Pages. It publishes an arXiv metadata snapshot and runs entirely in the browser. There is no runtime API server or login.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run refresh-data
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000). `npm run dev` also serves the static app during development. Refreshing takes roughly a minute: it requests up to 200 records per configured category with at least 3.1 seconds between arXiv requests. The generated `public/data/papers.json` is ignored by Git; the Pages workflow generates it on every deployment.

## Deploy separately to GitHub Pages

1. Create a **separate** GitHub repository for Research Radar. GitHub Pages is public on a standard personal public repository; anyone can see the site, its code, and its paper dataset. Do not upload backups, `data/`, SQLite files, or other personal data.
2. Initialize Git in this directory if needed, review the files and `.gitignore`, commit, and push to the repository's `main` branch. No existing academic-site files need to change.
3. In the repository's **Settings → Pages**, choose **GitHub Actions** as the source. Enable Actions if needed. The included workflow runs on a push to `main`, manually from Actions, and daily at **03:15 UTC**. If your deployment branch is not `main`, change the workflow's push branch.
4. Wait for the workflow to succeed and use the Pages URL shown in Settings or its deployment. A project URL such as `https://USERNAME.github.io/REPOSITORY/` works; relative assets and dataset paths support project subpaths. Link that URL from your academic homepage when ready.

Scheduled runs can be delayed by GitHub. A failed ingestion or deployment leaves the previous published snapshot in place; check the Actions run for errors. Forks or inactive repositories may have scheduled workflows disabled by GitHub. The app shows the snapshot's actual refresh timestamp in UTC.

## Personal data and migration

Saved papers, interests, and feedback live in **browser local storage**, not in the Pages dataset. They are specific to the browser and site origin, do not sync across devices, and can be lost when site data is cleared. Anyone with access to that browser profile can read them. The public website itself is not access-controlled. Use **Export backup** to download a JSON file and keep it somewhere private. **Import backup** validates the file and, after confirmation, replaces that browser's saved papers, interests, and feedback. Export first if the existing browser data should be retained. Appearance preference is browser-local and is not included in the backup.

If you used the previous local SQLite app, its `data/radar.sqlite` is not deleted or automatically migrated. On the machine containing that file, run:

```sh
cd ~/Projects/research-radar
npm run export-sqlite -- ~/Downloads/research-radar-backup.json
```

The export reads SQLite without modifying it, requires a new file outside the project, and refuses to overwrite a file. Then open the Pages app in the browser where you want the data and choose **Import backup**. Treat the exported file as private: do not commit, publish, or share it unintentionally. The local app and the Pages site have different origins and do not share browser storage automatically.

## Coverage and limitations

The workflow collects the newest 200 entries from `cs.*` and each configured category: `cs.AI`, `cs.LG`, `cs.CL`, `cs.CV`, `cs.CR`, `cs.SE`, `cs.HC`, `cs.RO`, `cs.OS`, `cs.DB`, `cs.DC`, `cs.PL`, `cs.IR`, `cs.NE`, `cs.CC`, `cs.MA`, and `eess.SY`. Versions are deduplicated. Busy categories may have more than 200 relevant papers between refreshes; older papers, categories outside this list, revisions, and papers not indexed by arXiv can be missed. Client-side date, topic, and literal text filters search only this snapshot, not all arXiv. Discovery displays at most 40, 100, or 200 matches. Operating systems maps to `cs.OS`; autonomous systems is a broad `cs.RO`/`cs.MA`/`eess.SY` proxy, not a precise classification. The theory filter maps to `cs.CC` and systems and control to `eess.SY`.

The overview counts each fetched paper once under its first listed category, and previews saved papers and keyword-matched abstract leads. The digest shows at most ten matches from the filtered result set. Possible problem signals and investigation cards quote abstracts and may misclassify solved problems; they are not full-text or review analysis, validated gaps, or novelty claims. **No automated counter-search is performed.** Investigation cards provide a manually opened arXiv search link with suggested terms. Inspect results, broaden the search, and consult full papers and other sources before drawing conclusions. Clicking external links takes you to arXiv.

## Checks

```sh
npm test
npm run build
```
