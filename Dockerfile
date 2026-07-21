# 1. Start from an official Node.js image
FROM node:20-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package files first (for caching — see note below)
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of your app's code
COPY . .

# 6. Tell Docker which port your app listens on
EXPOSE 3000

# 7. Command to run when the container starts
CMD ["node", "app.js"]