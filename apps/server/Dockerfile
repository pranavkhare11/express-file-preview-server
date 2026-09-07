FROM node:20-slim AS base

# Install ffmpeg and libyaml for native Aerospike C++ client
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libyaml-0-2 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server package specification
COPY apps/server/package.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy server application source code
COPY apps/server ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
