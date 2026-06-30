# BSCG Business Owner Tax Strategy Fact Finder

Client-facing interactive click-through based on the BSCG Business Owner Tax Strategy Fact Finder PDF.

## Live site

https://jonray757-hue.github.io/bscg-fact-finder/

## Client link with advisor pre-filled

```
https://jonray757-hue.github.io/bscg-fact-finder/?advisor=Johnny%20Harris&email=johnny@retirementfoundationforamerica.com
```

## Local preview

Open `index.html` in a browser, or:

```bash
cd /Users/ramseykoaharris/Work/projects/bscg-fact-finder
python3 -m http.server 8080
```

Then visit http://localhost:8080

## Deploy

Pushes to `main` auto-deploy via GitHub Actions (`.github/workflows/deploy-pages.yml`).

```bash
./tools/push-to-github.sh
```