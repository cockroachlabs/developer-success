# Node.js 

## Overview

In these labs, you will practice writing Node.js CRUD REST API using node-postgres driver

## Labs Prerequisites

1. Connection URL to the Cockroach Cloud Free Tier

2. You also need:

    - a modern web browser
    - [Cockroach SQL client](https://www.cockroachlabs.com/docs/stable/install-cockroachdb-linux)
    - Curl or Postman to test REST calls

## Lab 1 - Connect to CockroachCloud cluster to create schema
Replace username, password, cluster name in the connections string.
If you created a cluster on AWS, the cluster URL will look slightly different.
```bash
cockroach sql --url 'postgresql://username:password@free-tier.gcp-us-central1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full&sslrootcert=directory-to/root.crt&options=--cluster%3Dcluster-name'
```
## Lab 2 - Set up local Node.js environment
Download and install [Node.js](https://nodejs.org/en/)

```bash
## Install express, pg
npm i express pg dotenv nodemon
```

## Lab3 - Start up app
Rename example-app-node-postgres/env-template to example-app-node-postgres/.env and update the connection info and credentials.
```
# Database connection info
DB_USERNAME=yourusername
DB_PASSWORD=databasepassword
DB_HOST=free-tier.gcp-us-central1.cockroachlabs.cloud
DB_DBNAME=clustername.database
DB_PORT=26257
```
 Then start up node.js app
```bash
## start app
Nodemon index.js
```
In browser open `http://localhost:3000/api/customers`

## Lab 4 - Test Create API
Use Postman or Curl to create a user called Jon Snow w/ email jsnow@gameofthrone.net
```bash
curl -X POST \
  http://localhost:3000/api/customers \
  -H 'content-type: application/json' \
  -d '{"first_name":"John",
	"last_name": "Snow",
	"email": "jsnow@gameofthrone.net"
}'
```

## Lab 4 - Test Create API
Use Postman or Curl to create a user called Jon Snow w/ email jsnow@gameofthrone.net
```bash
$ curl -X POST \
  http://localhost:3000/api/customers \
  -H 'content-type: application/json' \
  -d '{"first_name":"John",
	"last_name": "Snow",
	"email": "jsnow@gameofthrone.net"
}'
```

## Lab 5 - Test Create API
Use Postman or Curl to create a user called Jon Snow w/ email jsnow@gameofthrone.net
```bash
$ curl -X POST \
  http://localhost:3000/api/customers \
  -H 'content-type: application/json' \
  -d '{"first_name":"John",
	"last_name": "Snow",
	"email": "jsnow@gameofthrone.net"
}'
```
## Lab 5 - Test Select API
Use the UUID returned Postman or Curl to get the user
```bash
curl -X GET \
  http://localhost:3000/api/customers/{uuidreturned} 
```
## Lab 6 - Test Update API
Use the UUID returned Postman or Curl to update Jon Snow's email address
```bash
curl -X PUT \
  http://localhost:3000/api/customers/{uuidreturned} \
  -H 'content-type: application/json' \
  -d '{"first_name":"John",
	"last_name": "Snow",
	"email": "johnsnow@gameofthrone.net"
}'
```
## Lab 7 - Test Delete API
Use the UUID returned Postman or Curl to delete John Snow
```bash
curl -X DELETE \
    http://localhost:3000/api/customers/{uuidreturned} 
```
