# Lint notes

Run everything with `npm ci && npm run lint` (CI does this on pull requests). Individual tools: `npm run lint:html`, `lint:css`, `lint:js`. Errors fail the run; warnings do not.

The pages are a one-for-one copy of a live Squarespace site, so rules were relaxed where they flag the copied style rather than real bugs. No file under `site/` was changed to satisfy a linter.

Tool versions are pinned by `package-lock.json`. `html-validate` is held at 10.x because 11.x needs Node 22 (`fs.globSync`), while CI and the dev machine use Node 20.

## html-validate (`.htmlvalidate.json`, extends `html-validate:recommended`)

Scope: `site/**/*.html`, including `site/_template.html`.

| Rule | Setting | Why |
| --- | --- | --- |
| `no-implicit-button-type` | warn | The buttons (carousel arrows, burger, gallery thumbs) sit outside forms, so the default `submit` type does nothing. Adding `type="button"` is safe but touches 30+ pages. |
| `no-inline-style` | warn | Section background images are set inline, copied from the live pages. |
| `prefer-native-element` | warn | `<div role="region">` on the missionaries carousel, copied from the live page. |
| `form-dup-name` | error, with `checkbox` added to `shared` | The contact form's "Inquiring About" checkboxes intentionally share `name="inquiring_about"` so Formspree receives them as one field. |

Remaining warnings: 41 (0 errors).

- `no-implicit-button-type`: 34, for example `site/index.html:66`, `site/index.html:210`, `site/_template.html:43`
- `no-inline-style`: 6, for example `site/index.html:88`, `site/index.html:99`, `site/about/index.html:58`
- `prefer-native-element`: 1, `site/missionaries/index.html:60`

## stylelint (`.stylelintrc.json`, extends `stylelint-config-standard`)

Scope: `site/assets/css/**/*.css`. Before tuning: 416 errors.

Turned off (formatting or notation choices that match the compact Squarespace-derived style; none are bugs):

| Rule | Count before | Why |
| --- | --- | --- |
| `declaration-block-single-line-max-declarations` | 311 | CSS is written as one-line rules. |
| `color-function-notation` | 21 | Legacy `rgba()` / `hsl()` commas are used throughout. |
| `media-feature-range-notation` | 13 | `(max-width: 900px)` instead of range syntax. |
| `alpha-value-notation` | 12 | `.3` instead of `30%`. |
| `color-function-alias-notation` | 12 | `rgba()` instead of `rgb()`. |
| `hue-degree-notation` | 9 | Unitless hues in `hsl()`, as in the design tokens. |
| `at-rule-empty-line-before` | 8 | Compact layout. |
| `selector-attribute-quotes` | 4 | Style only. |
| `selector-class-pattern` | 2 | Squarespace-style BEM modifiers such as `.eventlist-datetag-startdate--month`. |
| `selector-not-notation` | 2 | Style only. |
| `value-keyword-case` | 2 | Style only. |
| `rule-empty-line-before` | 1 | Compact layout. |

Downgraded to warn (could point at a real problem, but fixing means reordering or editing styles, which risks visual changes):

- `no-descending-specificity`: 14. Examples: `site/assets/css/styles.css:37`, `site/assets/css/styles.css:86`, `site/assets/css/pages/events.css:54`, `site/assets/css/pages/home.css:77`
- `property-no-vendor-prefix`: 2. `site/assets/css/forms.css:14`, `site/assets/css/styles.css:15`
- `no-duplicate-selectors`: 2. `site/assets/css/pages/events.css:52`, `site/assets/css/pages/events.css:117`
- `declaration-block-no-duplicate-properties`: 1. `site/assets/css/pages/missionaries.css:3` (`top:0` then `top:102px` in `.miss-title`; the later value wins)

Remaining: 0 errors, 19 warnings.

## eslint (`eslint.config.js`, flat config, `@eslint/js` recommended)

Scope: `site/assets/js` (browser globals, classic scripts) and `tools/*.mjs` (ES modules, node globals plus browser globals for code inside `page.evaluate`).

| Rule | Setting | Why |
| --- | --- | --- |
| `no-empty` | error, `allowEmptyCatch: true` | `site/assets/js/events.js:230` and `:240` wrap `localStorage` in `try {} catch (err) {}` on purpose, since storage can throw in private browsing. |
| `no-unused-vars` | error, `caughtErrors: 'none'` | Same catch blocks; the error object is unused by design. |

Remaining: 0 errors, 0 warnings.

## Not linted

`reference/`, `compare/`, `verify-out/`, `node_modules/` are ignored. The verify skill scripts under `.claude/skills/verify/scripts/` and `tools/*.py` / `tools/serve.sh` are outside the lint scripts.
