# Гүйцэтгэлийн хянагч — үйлдвэрлэлийн дүрс
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/app ./app
COPY --from=build /app/lib ./lib
COPY --from=build /app/components ./components
COPY --from=build /app/next.config.ts ./

# Өгөгдлийн сан (data/db.json) энд хадгалагдана — эзэлхүүн холбоно уу:
#   docker run -v hyanalt-data:/app/data -p 3000:3000 hyanalt
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["npm", "start"]
