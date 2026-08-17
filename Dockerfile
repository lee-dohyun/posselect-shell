FROM node:20-alpine AS build
WORKDIR /app
# git: package.json이 @posselect/ui를 github: 의존성으로 참조해서 npm install에 필요
RUN apk add --no-cache git
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm run build-storybook

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/storybook-static /usr/share/nginx/html/storybook
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
