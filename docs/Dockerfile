FROM python:3.12-slim

WORKDIR /docs

COPY docs/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY docs/ .

EXPOSE 8001

CMD ["mkdocs", "serve", "-a", "0.0.0.0:8001", "--livereload", "--watch", "/docs/docs"]
