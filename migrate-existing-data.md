# Migrate Existing Data to CockroachDB Serverless

## Overview

Application developers often have existing applications and databases that they want to migrate into CockroachDB Serverless. CockroachDB Serverless makes this easy by providing out-of-the-box migration options. This enables developers to quickly move an application to CockroachDB Serverless and take advantage of the power and convenience of a serverless database.

This workshop is designed to demonstrate how an application developer can migrate an existing Postgresql database to CockroachDB Serverless in several easy steps.

1. Spin up a new CockroachDB Serverless cluster 
2. Setup a databasqe user for migration
3. Create a `pg_dump` backup of an existing Postgresql database
4. Upload the `pg_dump` backup to the newly created cluster
5. Run a database import from the `pg_dump` backup into the new CockroachDB Serverless cluster

To demonstrate this, we will be using a real production database used to power [ClimbingWeather.com](https://www.climbingweather.com). [ClimbingWeather.com](https://www.climbingweather.com) is a website designed to provide weather forecasts for climbing areas in the United States.

## Quick Tour of the Database

The database that we are using is a Postgresql database. To make it easier for demonstration purposes, it has been slimmed down to 7 key tables:

* `area`: Climbing areas in the United States with a unique id, latitude/longitude, name and a handful of other fields.
* `daily`: Daily weather forecasts. Each row references a specific `area`, date and a number of weather data points, such as high and low temperatures.
* `hourly`: Hourly weather forecasts. Each row references a specific `area`, date/time and a number of weather data points.
* `state`: US states.
* `country`: Countries. Even though ClimbingWeather.com currently only has climbing areas in the United States, the table is used in the weather API.
* `system_setting`: A table of key-value combinations for system settings.
* `area_zip_code_distance`: A pre-calculated table of zip code distances for searching climbing areas by US zip code.
* `clim81_station_monthly`: Monthly averages from weather observation stations.

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
IMPORT PGDUMP "userfile:///cw-pgdump.sql" WITH ignore_unsupported_statements;
```

Success! The database is successfully imported. To take a look around you can run a few SQL commands:

```sql
-- Show all tables in the cw database
SHOW TABLES;

-- Describe table
\d area;

-- Alternatively, you can use the show create table syntax
SHOW CREATE TABLE daily;
```

## What's Next

You have successfully imported a Postgresql database into CockroachDB Serverless.

This workshop has provided a very basic approach to importing data into CockroachDB Serverless.

### Documentation

[Migration Overview](https://www.cockroachlabs.com/docs/v21.1/migration-overview.html) - official migration documentation for CockroachDB 21.1




### Other Supported formats

* MySQL backup using `mysqldump`
* CSV/TSV
* Avro
* ESRI Shapefiles (`.shp`) (using `shp2pgsql`)
* OpenStreetMap data files (`.pbf`) (using `osm2pgsql`)
* GeoPackage data files (`.gpkg`) (using `ogr2ogr`)
* GeoJSON data files (`.geojson`) (using `ogr2ogr`)

CockroachDB Serverless supports additional 


Best practices and optimizations

[Best Practices Docmentation](https://www.cockroachlabs.com/docs/v21.1/import-performance-best-practices.html)

* Split data into multiple files
* Choose a performant import format
  * CSV or Delimited data
  * AVRO
  * MYSQLDUMP
  * PGDUMP
* Provide the table schema inline
* Import the schema separately from the data


Network file storage

[Cloud Storage](https://www.cockroachlabs.com/docs/v21.1/use-cloud-storage-for-bulk-operations)
* Amazon
* Azure
* Google Cloud
* http
* NFS/local

