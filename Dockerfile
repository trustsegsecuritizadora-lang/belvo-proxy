FROM oven/bun:1.3
WORKDIR /app
COPY package.json .
RUN bun install
COPY index.tsx .
EXPOSE 3000
CMD ["bun", "run", "index.tsx"]
