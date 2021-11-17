# Migrate Existing Data to CockroachDB Serverless

## Overview

Application developers often have existing applications and databases that they want to migrate into CockroachDB Serverless. CockroachDB Serverless makes this easy by providing out-of-the-box migration options. This enables developers to quickly move an application to CockroachDB Serverless and take advantage of the power and convenience of a serverless database.

This workshop is designed to demonstrate how an application developer can migrate an existing Postgresql database to CockroachDB Serverless in several easy steps.

1. Spin up a new CockroachDB Serverless cluster 
2. Setup a database user for migration
3. Create a `pg_dump` backup of an existing Postgresql database
4. Upload the `pg_dump` backup to the newly created cluster
5. Run a database import from the `pg_dump` backup into the new CockroachDB Serverless cluster

To demonstrate this, we will be using a real production database used to power [ClimbingWeather.com](https://www.climbingweather.com). [ClimbingWeather.com](https://www.climbingweather.com) is a website designed to provide weather forecasts for climbing areas in the United States.

## Quick Tour of the Database

The database that we are using is a Postgresql database. To make it easier for demonstration purposes, it has been slimmed down to 11 key tables:

* `area`: Climbing areas in the United States with a unique id, latitude/longitude, name and a handful of other fields.
* `daily`: Daily weather forecasts. Each row references a specific `area`, date and a number of weather data points, such as high and low temperatures.
* `hourly`: Hourly weather forecasts. Each row references a specific `area`, date/time and a number of weather data points.
* `state`: US states.
* `country`: Countries. Even though ClimbingWeather.com currently only has climbing areas in the United States, the table is used in the weather API.
* `system_setting`: A table of key-value combinations for system settings.
* `clim81_station`: Weather observation stations
* `clim81_station_monthly`: Monthly averages from weather observation stations.
* `daily_archive`: Archived daily forecasts
* `zip_code`: US zip codes, including latitude and longitude
* `area_zip_code_distance`: A pre-calculated table of zip code distances for searching climbing areas by US zip code.

These tables are the bare minimum for running the ClimbingWeather.com API that powers the websites and mobile apps.


## Spin up a new CockroachDB Serverless cluster

Before we get started, you'll need to create a CockroachDB Serverless cluster.

To sign up for free (or login to an existing account), go to https://cockroachlabs.cloud.

After you are logged in, do the following:

1. Click the "Create Cluster" button.
2. Select the "Serverless" plan.
3. Select a cloud provider
4. Set a $0 spending limit (the default)
5. Enter a name (or use the one automatically generated)
6. Click "Create your free cluster"

The cluster should take no more than 10-15 seconds to create.

Once your cluster is created, you will be presented with the "Connection Info". You can always access this information later by clicking the "Connect" button from your cluster page.

In the "Connection Info" window make sure to do the following:

1. Download and install the `cockroach` binary. You will be using the `cockroach` binary to connect to your cluster.
2. Download the CA certificate. Don't skip this step since you will not be able to connect to your cluster without the CA certificate. The `curl` command will automatically download and save it to your local machine.
3. Copy and the connection string. This includes your password. The password has been automatically generated for you. Make sure to write down it down or store it in a password manager, as it will not be displayed again. If you lose your password, you can always reset it but you will be able to view your it again.

Nice work! You are ready to prepare the cluster for migration by creating a database and setting up a migration user.

## Setup a database and a user for migration

Next, you will create a database on the cluster and create a database user for the migration process. The user that was automatically created when you setup your cluster is an admin user. It is good practice to create a separate user for migration.

Login to your cluster by running the connection string that was provided in the "Connection Info" window. For this step, you will be using the inital admin user created for you.

The connection string will look similar to the following. The username, password and cluster name will be the ones you just created. For example, this connection string has the username `jon`, password `XXXXXXXXXXX` and cluster name `vague-beaver-1226`.

```bash
cockroach sql --url 'postgresql://jon:XXXXXXXXXXX@free-tier4.aws-us-west-2.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full&sslrootcert='$HOME'/.postgresql/root.crt&options=--cluster%3Dvague-beaver-1226'
```

After you are connected to the cluster, you should see a SQL prompt. At the SQL prompt, issue the `CREATE DATABASE` statement:

```sql
CREATE DATABASE cw;
```

Great! You have created a new database.

Now let's create the migration user.

```sql
-- create user
CREATE USER migrate WITH LOGIN PASSWORD 'migrate1234';

-- verify that user was created
SHOW USERS;

-- grant access to cw
GRANT ALL ON DATABASE cw TO migrate;

-- grant ability to upload userfile
GRANT CREATE ON DATABASE defaultdb TO migrate;

-- verify grants
SHOW GRANTS ON DATABASE cw;

-- exit from the cockroach client
\q
```

Let's verify that you can connect with the newly created user. To make connecting easier, you can save the connection URL in an environment variables that `cockroach` will recognize. This will be used for the rest of the workshop.

Take your connection string and replace the database with `cw` the `jon:XXXXXXX` part (yours will have a different username) with `migrate:migrate1234` and try re-connecting to the cluster. Make sure you have also correctly set the cluster name.

```bash
cockroach sql --url 'postgresql://migrate:migrate1234@free-tier4.aws-us-west-2.cockroachlabs.cloud:26257/cw?sslmode=verify-full&sslrootcert='$HOME'/.postgresql/root.crt&options=--cluster%3Dvague-beaver-1226'
```

After you have confirmed that you can connect, set the `COCKROACH_URL` environment variable. This will make it no longer necessary to enter the `--url` command when connecting to your cluster.

```bash
export COCKROACH_URL=[your url with the migrate user]
```

Try connecting with the `cockroach` client without the `--url` parameter.

```bash
cockroach sql
```

You should be logged into your cluster.

Remember that on most operating systems the environment variable will only apply to the current session. If you open a new terminal window, you'll have to repeat the `export` command. Alternatively, you could set it in your `.bashrc` or `.zshrc` file so it is set on each new session.

## Create a pg_dump backup of the Postgresql database

If you have an existing Postgresql database, running `pg_dump` to backup the database is easy.

Log in to your Postgresql database server and run the following command, replacing DATABASE with your database name:

```bash
pg_dump DATABASE > /tmp/cw-pgdump.sql
```

If you cannot login to the Postgresql database directly and need to do a remotely run the `pg_dump` command, you can include a parameter for the HOSTNAME:

```bash
pg_dump -h HOSTNAME -U USERNAME -W PASSWORD cw > /tmp/cw-pgdump.sql
```

For this workshop, an existing `pg_dump` backup has been provided in the `data/` directory of the repository. It is named `cw-pgdump.sql`.


## Upload the pg_dump backup to the newly created cluster

To upload the `pg_dump` backup to the newly created cluster, you will use the cluster's local file storage.

If you have set a spending limit for your serverless cluster above $0 and entered a credit card, you can also use a network-based file storage option, such as S3. However, cluster file storage is available to all clusters regardless of spending limit.

To access cluster file storage, you will use the `userfile` command available in the `cockroach` client.

CockroachDB Serverless supports the following commands for managing cluster file storage:

- `cockroach userfile upload`
- `cockroach userfile list`
- `cockroach userfile get`
- `cockroach userfile delete`

Start by listing the files available on your cluster:

```bash
# note: if you have not set the $COCKROACH_URL environment variable
#  you will need to include the --url parameter
cockroach userfile list
```

You will see an error indicating that the userfile relation does not exist. This is only because we have not yet uploaded a userfile.

Next, upload the `pg_dump` backup:

```bash
# note: if you have not set the $COCKROACH_URL environment variable
#  you will need to include the --url parameter
cockroach userfile upload cw-pgdump.sql 
```

You should see a message that it was successfully uploaded with the path to the file:

```
successfully uploaded to userfile://defaultdb.public.userfiles_migrate/cw-pgdump.sql
```

This is the full file path to the cluster file. As we will see below, you can omit the first part of this path using the `///` syntax.

You may also see a warning about the `--url` parameter specifying a database. This warning can be ignored. If you don't want to see the warning, just remove the database name from the connection string.

Note that file cluster storage counts against your overall available cluster storage. At the time of this workshop, the free storage is 5gb. If you uploaded a 1gb file, then you would only have 4gb of storage remaining. You can free up this storage after migration by deleting the file.

Now try to list the userfiles:

```bash
cockroach userfile list
```

The command should output the list of files stored in cluster file storage.

## Run a database import from the pg_dump backup into the CockroachDB Serverless cluster

Now that the `pg_dump` backup has been uploaded to the cluster, you can import its contents.

Connect using the `cockroach` client as the `migrate` user:

```bash
# note: if you have not set the $COCKROACH_URL environment variable
#  you will need to include the --url parameter
cockroach sql
```

Once connected, change to the `cw` database (if you are not already connected to it) and run the `IMPORT` command:

```sql
USE cw;
IMPORT PGDUMP "userfile:///cw-pgdump.sql";
```

You'll noticed that you'll get the following error:

```sql
ERROR: unsupported *tree.SetVar statement: SET statement_timeout = 0
HINT: To ignore unsupported statements and log them for review post IMPORT, see the options listed in the docs: https://www.cockroachlabs.com/docs/stable/import.html#import-options
```

To fix that problem, include the `WITH ignore_unsupported_statements` option. You can also use the `log_ignored_statements` option to log ignored statements to cluster file storage.

```sql
IMPORT PGDUMP "userfile:///cw-pgdump.sql" WITH ignore_unsupported_statements, log_ignored_statements='userfile:///cw-pgdump.log';
```

The first error that we encounter is about `IMPORT PGDUMP` nots supporting user defined types:

```
ERROR: IMPORT PGDUMP does not support user defined types; please remove all CREATE TYPE statements and their usages from the dump file
```

At this time, it user defined types have to be created prior to running the `IMPORT` command. 

There is one user defined type in the backup, so we'll add that manually. Then, exit out of the `cockroach` client.

```sql
CREATE TYPE public.system_log_severity AS ENUM (
    'info',
    'warning',
    'error'
);
\q
```

Next, we'll comment out the `CREATE TYPE` statment in the backup file and re-upload. Then, re-connect using `cockroach sql`.

```bash
# First edit the file, using the --- at the start of the
# lines that include the CREATE TYPE statement
# then delete and upload the file
cockroach userfile delete cw-pgdump.sql
cockroach userfile upload cw-pgdump.sql
cockroach sql
```

Re-connect with `cockroach sql` and try the import again:

```sql
IMPORT PGDUMP "userfile:///cw-pgdump.sql" WITH ignore_unsupported_statements, log_ignored_statements='userfile:///cw-pgdump.log';
```

You should see output that the import job completed successfully.

Success! The database is successfully imported. To take a look around you can run a few SQL commands:

```sql
-- Show all tables in the cw database
SHOW TABLES;

-- Describe table
\d area;

-- Alternatively, you can use the show create table syntax
SHOW CREATE TABLE daily;
```


Next, you can inspect the log file created for unsupported statements. Exit the `cockroach` client, list usefiles and then download the log file.

```bash
# first exit the cockroach client using \q
cockroach userfile list
cockroach userfile get [USERFILE PATH]
```

The log file should look similar to the following. None of the unsupported statements raises concern.

```
SET statement_timeout = 0: unsupported by IMPORT
SET lock_timeout = 0: unsupported by IMPORT
SET idle_in_transaction_session_timeout = 0: unsupported by IMPORT
SET client_encoding = 'UTF8': unsupported by IMPORT
SET standard_conforming_strings = "on": unsupported by IMPORT
unsupported function call: set_config in stmt: SELECT set_config('search_path', '', false): unsupported by IMPORT
SET check_function_bodies = false: unsupported by IMPORT
SET xmloption = content: unsupported by IMPORT
SET client_min_messages = warning: unsupported by IMPORT
SET row_security = off: unsupported by IMPORT
```

## Google Cloud Run Bonus (time permitting)

This section is planned for the live stream on Nov 17, 2021.

Because the current iteration of ClimbingWeather.com is using MySQL, it wasn't easy to move it to CockroachDB since the database drivers would need to be swapped out. Instead, I created a light-weight REST API using Golang, pgx, Gin and Google Cloud Run.

This application uses one environment variable and a mounted file to setup the database connection:

* `DB_URL`: this is the connection string used by `pgx` to connect to either Postgresql or CockroachDB Serverless.
* `CW_DB_CRT`: this is the CA certificate that is mounted to `/certs`

These are stored as secrets in Google Cloud Platform and passed into the Google Cloud run instance.

To run against Postgresql, I simply update the `DB_URL` environment variable to the Postgresl connection string, something like:

`user=cwapp password=XXXXXXX database=cw host=/cloudsql/api-project-XXXX:us-central1:cw-pg-dev`

To run against my CockroachDB Serverless cluster, I update the `DB_URL` environment to something similar to this:

`postgresql://migrate:XXXXX@free-tier.gcp-us-central1.cockroachlabs.cloud:26257/cw?sslmode=verify-full&sslrootcert=/certs/CW_CRDB_CRT&options=--cluster%3Dcw-test-XXXX`

The connection string has a reference to the CA certificate path `/certs/CW_CRDB_CRT`.

To test this, we insert a new record into the area table:

```sql
INSERT INTO area (name, latitude, longitude) values ('Squamish', 49.7016, -123.1558);
```

When running against Postgresql, the API path `/area/3/forecast` returns a result but when run against the new Squamish path `/area/1116/forecast` it fails since the area does not exist.

When running against CockroachDB Serverless, both API paths return valid results.

This sample REST API application demonstrates how easy it is to switch between Postgresql and CockroachDB Serverless with only a configuration change.

## What's Next

You have successfully imported a Postgresql database into CockroachDB Serverless.

This workshop has provided a very basic approach to importing data into CockroachDB Serverless.

### Documentation

[Migration Overview (v21.2)](https://www.cockroachlabs.com/docs/v21.2/migration-overview.html) - official migration documentation for CockroachDB 21.2

### Supported formats

The `IMPORT` command supports the following formats:

* Postgresql backup using `pg_dump`
* MySQL backup using `mysqldump`
* CSV/TSV
* Avro
* ESRI Shapefiles (`.shp`) (using `shp2pgsql`)
* OpenStreetMap data files (`.pbf`) (using `osm2pgsql`)
* GeoPackage data files (`.gpkg`) (using `ogr2ogr`)
* GeoJSON data files (`.geojson`) (using `ogr2ogr`)

### Best practices and optimizations

[Best Practices Docmentation](https://www.cockroachlabs.com/docs/v21.1/import-performance-best-practices.html)

* Import the schema separately from the data
* Split data into multiple files
* Provide the table schema inline
* Choose a performant import format
  * CSV or Delimited data
  * AVRO
  * MYSQLDUMP
  * PGDUMP

### Network file storage

In addition to the cluster file storage described in the workshop, cloud storage can be used if you increase the spend limit and enter a credit card.

[Cloud Storage Documentation](https://www.cockroachlabs.com/docs/v21.1/use-cloud-storage-for-bulk-operations)

Cloud Storage Providers
* Amazon
* Azure
* Google Cloud
* http
* NFS/local

