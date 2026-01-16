FROM node:22-alpine

WORKDIR /app

# Copy dependency files
COPY package.json yarn.lock .yarnrc.yml ./
RUN mkdir -p .yarn/releases
COPY .yarn/releases/* ./.yarn/releases/

# Install dependencies
RUN yarn install

# Copy the rest of the application
COPY . .

EXPOSE 5173

CMD ["yarn", "dev", "--host", "0.0.0.0"]
