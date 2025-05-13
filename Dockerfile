FROM node:18

# Arbeitsverzeichnis setzen
WORKDIR /app

# package.json + lock installieren
COPY package*.json ./
RUN npm install

# Restliche App-Dateien kopieren
COPY . .

# Startbefehl
CMD ["npm", "start"]
