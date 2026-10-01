FROM python:3.14.6-slim

WORKDIR /docs

COPY docs/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Note: only docs/ is copied, so the mkdocstrings page for the API
# (nav entry "code/api/index.md", which introspects ../api/src) cannot be
# generated in this image. CI builds the site from the repo root instead, where
# api/src is present. The compose `docs` service is commented out for this
# reason; use `./s/docs` for local preview.
COPY docs/ .

EXPOSE 8001

CMD ["zensical", "serve", "-a", "0.0.0.0:8001", "--livereload", "--watch", "/docs/docs"]
