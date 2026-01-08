FROM node:22-alpine

# Set working directory /app
WORKDIR /app

# Copy dependency files
COPY package.json yarn.lock .yarnrc.yml ./
RUN mkdir -p .yarn/releases
COPY .yarn/releases/* ./.yarn/releases/

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy application
COPY . ./

# Install dependencies
RUN yarn install

EXPOSE 5173

# Start the development server
CMD ["yarn", "dev", "--host", "0.0.0.0"]
