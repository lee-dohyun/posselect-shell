FROM node:22-alpine AS build
WORKDIR /app
# git: package.json이 @posselect/ui를 github: 의존성으로 참조해서 의존성 설치에 필요
RUN apk add --no-cache git
COPY package*.json ./
# npm install 이 아니라 npm ci — install 은 lock 을 무시하고 빌드 시점에 다시 해석해서
# 프로덕션 이미지가 결정적이지 않았다. 그 상태에서 CI 의 npm ci 는 죽어 있었고(#124)
# 배포만 계속 나갔다. lock 이 어긋나면 여기서도 실패하는 게 맞다.
RUN npm ci
COPY . .
RUN npm run build
RUN npm run build-storybook

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/storybook-static /usr/share/nginx/html/storybook
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
