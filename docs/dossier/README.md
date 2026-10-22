# Dossier

LaTeX sources for the Anspruch dossier and the documents it lists.

- `anspruch-dossier.tex`: the dossier (German, with a one-page English summary).
- `antrag/`: application documents (Projektbeschreibung, Finanzplan, Zeitplan).
- `partner/`: documents for a pilot partner (Anschreiben, Letter of Intent, Kooperationsvereinbarung, Factsheet).
- `preamble.tex`: shared settings and macros. Load it with `\input{preamble}` here or `\input{../preamble}` in a subfolder. It defines `\blank{…}` (a highlighted placeholder to fill before sending), `\todo{…}` (a "zu bestätigen" margin note) and `\draftmark` (the header text).

## Build

Needs MiKTeX or TeX Live with `latexmk`; all packages ship with a standard MiKTeX installation. `latexmk` needs Perl: `build.ps1` uses Git for Windows' Perl if none is on PATH, and otherwise runs `pdflatex` three times.

```powershell
powershell -ExecutionPolicy Bypass -File docs/dossier/build.ps1
```

or, with `make`:

```bash
make -C docs/dossier
```

One document by hand, from its own folder: `latexmk -pdf -interaction=nonstopmode -outdir=build anspruch-dossier.tex` (in a subfolder use `-outdir=../build`).

## Output

All PDFs land in `docs/dossier/build/`. PDFs and LaTeX auxiliary files are not committed; `.gitignore` excludes them. Hand a PDF to someone only after every `\blank{…}` in it is filled.
