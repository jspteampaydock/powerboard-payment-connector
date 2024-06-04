# Paydock Payment Connector

## Overview

The Paydock Payment Connector facilitates integration between commercetools and Paydock, allowing for efficient management of payment processes. This repository is divided into two main modules:

- **Extension Module**: Serves as middleware, linking commercetools with Paydock. Configured to trigger on payment creation or updates within commercetools, it ensures these events are appropriately handled by Paydock.

- **Notification Module**: Handles asynchronous notifications from Paydock regarding payment status changes (e.g., authorization, charge, refund). This module updates the corresponding payment status in commercetools.

Both modules are essential for the seamless integration of commercetools and Paydock.

## Prerequisites

Ensure you have the following prerequisites before proceeding with installation:

- Docker and docker-compose installed on your machine.
- An active commercetools account with API credentials.
- Git installed on your machine.

#

## Installation Instructions

 In this manual you have **two ways** to do this. With `docker run...` and `docker-compose`

#

---
- ### With `docker run...`:
---

### Step 1: Clone the Repository

```
git clone https://github.com/PayDock/e-commerce-commercetools-payment-connector
```

and navigate to the project-directory
```
cd e-commerce-commercetools-payment-connector
```

### Step 2: Configure Environment Variables

#### For the Extension Module
Navigate to the extension directory and set up the environment variables:

```
echo 'PAYDOCK_INTEGRATION_CONFIG={
   "clientId":"[YOUR_CLIENT_ID]",
   "clientSecret":"[YOUR_CLIENT_SECRET]",
   "projectKey":"[YOUR_PROJECT_KEY]",
   "apiUrl":"https://api.[REGION_ID].gcp.commercetools.com",
   "authUrl":"https://auth.[REGION_ID].gcp.commercetools.com"
}' > ./extension/.env
```


Replace the placeholder values with your actual Commercetools API credentials.


#### For the Notification Module
Navigate to the notification directory and set up the environment variables:

```
echo 'PAYDOCK_INTEGRATION_CONFIG={
   "clientId":"[YOUR_CLIENT_ID]",
   "clientSecret":"[YOUR_CLIENT_SECRET]",
   "projectKey":"[YOUR_PROJECT_KEY]",
   "apiUrl":"https://api.[REGION_ID].gcp.commercetools.com",
   "authUrl":"https://auth.[REGION_ID].gcp.commercetools.com"
}' > ./notification/.env
```

Replace the placeholder values with your actual Commercetools API credentials.

### Step 3: Build the docker images and run the application

Build the docker images:

- `docker build -t commercetools-payment-connector-extention -f cnf/extension/Dockerfile .`

- `docker build -t commercetools-payment-connector-notification -f cnf/notification/Dockerfile .`

and launch the Docker container with the following command:

- `docker run -e PAYDOCK_INTEGRATION_CONFIG=xxxxxx -p 8082:8082 commercetools-payment-connector-extention`
 
- `docker run -e PAYDOCK_INTEGRATION_CONFIG=xxxxxx -p 8443:8443 commercetools-payment-connector-notification`

(Replace the placeholder `xxxxxx` for PAYDOCK_INTEGRATION_CONFIG variable  with your Json-escapes string)
###
The Extension Module will be accessible at: http://your_domain:8082

The Notification Module will be accessible at: http://your_domain:8443

#

---
- ### With `docker-compose`:
---

### Step 1: Clone the Repository

```
git clone https://github.com/PayDock/e-commerce-commercetools-payment-connector
```

and navigate to the project-directory
```
cd e-commerce-commercetools-payment-connector
```

### Step 2: Configure Environment Variables

- #### For the Extension Module
Navigate to the extension directory and set up the environment variables:

```
echo 'PAYDOCK_INTEGRATION_CONFIG={
   "clientId":"[YOUR_CLIENT_ID]",
   "clientSecret":"[YOUR_CLIENT_SECRET]",
   "projectKey":"[YOUR_PROJECT_KEY]",
   "apiUrl":"https://api.[REGION_ID].gcp.commercetools.com",
   "authUrl":"https://auth.[REGION_ID].gcp.commercetools.com"
}' > ./extension/.env
```


Replace the placeholder values with your actual Commercetools API credentials.


 - #### For the Notification Module
Navigate to the notification directory and set up the environment variables:

```
echo 'PAYDOCK_INTEGRATION_CONFIG={
   "clientId":"[YOUR_CLIENT_ID]",
   "clientSecret":"[YOUR_CLIENT_SECRET]",
   "projectKey":"[YOUR_PROJECT_KEY]",
   "apiUrl":"https://api.[REGION_ID].gcp.commercetools.com",
   "authUrl":"https://auth.[REGION_ID].gcp.commercetools.com"
}' > ./notification/.env
```

Replace the placeholder values with your actual Commercetools API credentials.
 


### Step 3: Build the docker images and run the application

- Replace the placeholder `xxxxxx` for PAYDOCK_INTEGRATION_CONFIG variable in **./docker-compose.yml** with your Json-escapes string.


- Launch docker-compose, docker images will be built automatically:

```
    docker-compose up -d
```


###
The Extension Module will be accessible at: http://your_domain:8082

The Notification Module will be accessible at: http://your_domain:8443

