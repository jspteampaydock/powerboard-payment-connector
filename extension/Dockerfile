# Use the latest stable Node.js LTS version
FROM node:18-alpine

# Set a label for the maintainer
LABEL maintainer="Professional Services <ps-dev@commercetools.com>"

# Set the working directory
WORKDIR /app

# Copy the application code
COPY . .

# Install dependencies with npm ci for a clean install
RUN npm ci --only=production

# Expose the port your app runs on (optional, specify if known)
# EXPOSE 3000

# Specify the command to run the application
CMD ["node", "src/init.js"]