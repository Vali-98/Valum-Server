# Use official Node.js image as a base
FROM node:23-slim

# Set working directory in container
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Run the Express server
CMD ["node", "index.js"]
