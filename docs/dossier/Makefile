# Builds every LaTeX document of the dossier into docs/dossier/build/.
# Usage: make -C docs/dossier        (clean: make -C docs/dossier clean)
# Needs latexmk on PATH. PDFs are not committed.

OUT := $(CURDIR)/build
LATEXMK := latexmk -pdf -interaction=nonstopmode -outdir=$(OUT)

ROOT_TEX := $(filter-out preamble.tex,$(wildcard *.tex))
SUB_TEX := $(wildcard antrag/*.tex partner/*.tex)

.PHONY: all clean $(ROOT_TEX) $(SUB_TEX)

all: $(ROOT_TEX) $(SUB_TEX)

$(ROOT_TEX):
	$(LATEXMK) $@ < /dev/null

# Documents in subfolders are built from their own folder,
# so that \input{../preamble} resolves.
$(SUB_TEX):
	cd $(dir $@) && $(LATEXMK) $(notdir $@) < /dev/null

clean:
	rm -rf $(OUT)
