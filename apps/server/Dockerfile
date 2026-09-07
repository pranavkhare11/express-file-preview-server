FROM node:20-alpine AS base

# Install ffmpeg for media transcoding
RUN apk update && apk add --no-cache ffmpeg

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
