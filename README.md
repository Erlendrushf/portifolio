# Project portfolio

A React portfolio for presenting approved project stories, images, and videos without connecting to the projects' source repositories. The collection includes real project summaries alongside the fictional Fieldnotes and Signal Board starter examples.

## Privacy first

This portfolio is intended to live in a **separate public repository**. Its files, branches, Git history, deployed JavaScript, and everything in `public/` are public, including assets that no project references. Your private project repositories remain separate and are not accessed by the site or workflow.

Before adding or committing anything, obtain any necessary permission and review descriptions, screenshots, recordings, metadata, URLs, and embedded data for confidential information. Keep private drafts outside the public repository: there is no private or unpublished record flag. Removing a file later does not erase it from Git history.

The entries based on private repositories contain high-level descriptions only, with no source links or copied project media. A "Private project" status describes the source repository, not the visibility of the portfolio entry, and does not imply deployment or production acceptance. Screenshots and recordings can be added separately after reviewing their contents and disclosure rights.

## Run locally

Install Node.js and npm. Supported Node versions are 22.22.2 or newer in the 22 line, 24.15.0 or newer in the 24 line, or 26 and newer. The Pages workflow uses Node 24.15.0.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. Edit `src/siteConfig.js` to change the visible site name, headline, and introduction; edit `index.html` to change the browser title and default description.

Other commands:

```sh
npm run validate  # Check project records and referenced media.
npm test          # Run content and UI tests.
npm run build     # Validate and create the static site in dist/.
npm run preview   # Serve the most recent build locally.
```

To run the production browser tests, install Playwright's Chromium once and run:

```sh
npx playwright install chromium
npm run test:e2e
```

Alternatively, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing compatible Chromium or Chrome executable before running the browser tests. The browser tests build isolated copies at the root and a repository subpath; they do not overwrite `dist/` or your project records.

For a local preview using a project-site base, use the same base for both commands:

```sh
PORTFOLIO_BASE_PATH=/my-repository/ npm run build
PORTFOLIO_BASE_PATH=/my-repository/ npm run preview
```

## Add a project

1. Create a JSON file in `src/content/projects/`, such as `example-service.json`. No React component needs to be changed.
2. Add the required fields below. The filename can differ from the slug, but each slug must be unique.
3. Optionally add approved media under `public/media/` and reference it from the record.
4. Run `npm run validate` and `npm run dev`, then review the result. Replace or remove the fictional starter records when ready.

This minimal record works without media:

```json
{
  "slug": "example-service",
  "title": "Example service",
  "summary": "A fictional service created for demonstration.",
  "description": [
    "A short paragraph describing the project.",
    "Another paragraph describing the outcome."
  ],
  "services": ["Automation"]
}
```

The project URL is `#/projects/example-service`. Service labels become catalog filters, and title, summary, services, and technologies are searchable.

### Project fields

All strings must be nonempty after trimming. Unknown fields are rejected.

| Field | Required | Format |
|---|---|---|
| `slug` | Yes | Unique lowercase letters and digits separated by single hyphens, for example `example-service`. |
| `title`, `summary` | Yes | Strings shown in the catalog and project page. |
| `description` | Yes | Array of at least one paragraph string. |
| `services` | Yes | Array of at least one service-label string. |
| `technologies` | No | Array of strings shown in the sidebar and included in search. |
| `metadata` | No | Object with optional `role`, `status`, and `period` strings, and an optional `highlights` array of strings. |
| `media` | No | Object with optional `images` array and `video` object, described below. |
| `links` | No | Array of objects with required `label` and `url` strings. URLs must use HTTPS and cannot contain embedded credentials. |

Each image object requires `src` and meaningful `alt`; it may also contain `caption`. The video object requires `src` and may contain `poster`, `captions`, and `transcript`. These are the only supported nested fields. See `src/content/projects/signal-board.json` for a working image and video example.

### Media and accessibility

Media paths are relative to `public/`: a file at `public/media/example/preview.png` is referenced as `media/example/preview.png`. Paths must point to existing files inside `public/`; absolute paths, traversal, backslashes, query strings, and fragments are not accepted. The validator checks file extensions and basic content signatures; for transcripts, it validates the entire file as UTF-8 and requires non-whitespace text.

- Images and video posters: `.avif`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.svg`, or `.webp`.
- Videos: `.m4v`, `.mp4`, `.ogv`, or `.webm`. Browser codec support varies; test your chosen file.
- Captions: WebVTT `.vtt` files. Transcripts: nonempty UTF-8 `.txt` files.

Use descriptive image alt text and rights-cleared media. Videos have native controls and do not autoplay. If a video contains meaningful audio, provide both captions and a transcript; the validator checks files you declare but cannot determine whether audio needs them. The fictional example video is silent.

### Editing on GitHub

After you have created the separate public portfolio repository, you can use GitHub's **Add file** or file editor to add a JSON record under `src/content/projects/` and upload approved files under `public/media/`. Public branches and pull requests are visible too, so review content before committing to any branch. The workflow checks changes, but it does not determine whether content is safe to disclose.

## Publish later with GitHub Pages

Repository creation and publication are separate owner actions:

1. Create a public repository containing only this portfolio, review its contents and history, and push the source and workflow. Do not copy private project repositories into it.
2. In the repository's **Settings > Pages**, set **Build and deployment > Source** to **GitHub Actions**. The first push may attempt deployment before Pages is configured; if so, rerun the workflow after configuring Pages.
3. In **Actions**, run **Build and deploy portfolio** for the default branch, or push an approved change to that branch. Check the workflow result and open the resulting Pages URL.

The workflow tests and builds branch pushes and pull requests. Only a default-branch push or a manual run targeting that branch uploads `dist/` and deploys. After Pages is configured, eligible default-branch pushes publish automatically. Human approval is your responsibility unless you separately configure suitable branch or `github-pages` environment protections.

The build automatically uses `/` for an `<owner>.github.io` user or organization site and `/<repository>/` for a normal project site. For a custom domain or another explicitly chosen base, set the repository Actions variable `PORTFOLIO_BASE_PATH` under **Settings > Secrets and variables > Actions > Variables**, for example `/` or `/my-repository/`. The value must start and end with `/`. Configure any custom domain in Pages settings separately.

Project links use fragments such as `https://<owner>.github.io/<repository>/#/projects/example-service`. They work on static hosting without a server rewrite, but search engines and social previews generally cannot treat each hash route as a separate page with its own metadata.

## Troubleshooting and limits

- **Validation fails:** read the reported filename and field, correct the JSON or media path, and rerun `npm run validate`. Duplicate slugs, unsupported fields, invalid HTTPS links, and missing or mismatched files fail the build.
- **A preview is unavailable:** check that the referenced file was included in `public/`, the deployed base is correct, and the browser supports the media format. A missing project URL shows a not-found page; check the slug.
- **A workflow fails:** inspect its Actions log and verify the Pages source, default branch, environment rules, and base override. The workflow has not been run on GitHub until you create and configure a repository.

GitHub warns about Git files larger than 50 MiB, blocks files larger than 100 MiB, and limits browser uploads to 25 MiB. GitHub Pages limits a published site to 1 GB and has a soft bandwidth limit of 100 GB per month. This build rejects `dist/` above 1,000,000,000 logical bytes; it does not check monthly bandwidth or individual Git file limits. Git LFS is not a Pages media workaround. Keep media small and consult the current [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Git file limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), and [Git LFS documentation](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage).
