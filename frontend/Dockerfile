# Development image for the Vite dev server.
#
# Development only. A deployment serves the *built* bundle as static files
# through Caddy; there is no Node process in production, which is why this
# image makes no attempt to be small or to run a production server.
#
# Node 26, matching the LTS line that opened on 2026-10-28 and the `engines`
# constraint in package.json.
FROM node:26.13.0-alpine

WORKDIR /srv/frontend

# Dependencies first, so editing source does not reinstall them. `npm ci`
# rather than `npm install`: it installs exactly the committed lockfile and
# fails if package.json and the lock disagree, which is the behaviour a build
# wants.
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

# Source arrives through a bind mount in docker-compose, so the dev server
# picks up edits without a rebuild. Copied here as well so the image is usable
# on its own.
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
