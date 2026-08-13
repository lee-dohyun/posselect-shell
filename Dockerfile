FROM node:20-alpine AS build
WORKDIR /app
# git: package.json이 @posselect/ui를 github: 의존성으로 참조해서 npm install에 필요
RUN apk add --no-cache git
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
