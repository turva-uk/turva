FROM python:3.14.7-slim

# Build context is the repository root, not app/, because the image needs both
# the Django project and the safety_file storage library as sibling packages.
# See ADR 0001 for why they are separate.

ENV PYTHONUNBUFFERED=1 \
	PYTHONDONTWRITEBYTECODE=1 \
	DJANGO_SETTINGS_MODULE=app.config.settings

WORKDIR /srv

# git is a runtime dependency, not a build tool: the safety file storage layer
# shells out to it for every read and write. python:*-slim does not include it.
RUN apt-get update \
	&& apt-get install --no-install-recommends --yes git \
	&& rm -rf /var/lib/apt/lists/*

# Run as a non-root user. Two reasons, both practical:
#
#  1. A web application processing untrusted input should not be root.
#  2. In development the source tree is bind-mounted, so files this container
#     writes - `makemigrations` output in particular - land in the working tree
#     with the container user's ownership. As root that produced root-owned
#     files the developer could not edit without sudo.
#
# UID 1000 is the first non-system user on Debian and Ubuntu and matches the
# default on a single-user Linux workstation. Override at build time if yours
# differs: `docker compose build --build-arg TURVA_UID=$(id -u)`.
ARG TURVA_UID=1000
ARG TURVA_GID=1000
RUN groupadd --gid "${TURVA_GID}" turva \
	&& useradd --uid "${TURVA_UID}" --gid "${TURVA_GID}" --create-home turva

# Install from the fully resolved locks so every build gets an identical
# dependency set. Regenerate with `s/lock`.
COPY app/requirements.txt app/requirements.dev.txt /srv/app/
COPY safety_file/requirements.in /srv/safety_file/
RUN pip install --no-cache-dir -r /srv/app/requirements.dev.txt

COPY manage.py pyproject.toml /srv/
COPY app /srv/app
COPY safety_file /srv/safety_file
COPY safety-file-templates /srv/safety-file-templates
COPY demo /srv/demo

# Collect static files into the image so it is self-contained in deployment,
# where STORAGES uses the manifest backend and will raise without one. The
# values here exist only for the duration of this command: collectstatic loads
# settings but never opens a database connection.
RUN SECRET_KEY=collectstatic-only \
	DEBUG=false \
	DB_HOST=localhost DB_USER=collectstatic DB_DATABASE=collectstatic \
	python manage.py collectstatic --noinput --clear

# Git refuses to operate on a repository owned by a different user than the one
# running the command. Safety file repositories are created by this process in a
# mounted volume, so ownership can differ depending on host uid mapping.
# Trusting the safety file root specifically - not "*" - keeps the exemption
# narrow.
RUN git config --system --add safe.directory '/srv/.turva-data/safety-files/*'

# Create the safety file root inside the image so that Docker initialises the
# named volume from it, carrying this ownership across. Without it the volume is
# created root-owned and the application cannot write a repository into it.
RUN mkdir -p /srv/.turva-data/safety-files \
	&& chown -R turva:turva /srv

USER turva

EXPOSE 8000

CMD ["gunicorn", "app.config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
