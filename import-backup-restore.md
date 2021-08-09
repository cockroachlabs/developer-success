# Import/Backup/Restore - Cockroach Cloud Free Tier

## Overview

Cockroach Cloud supports a wide range of import, backup and restore options. The Cockroach Cloud free tier provides a subset of the overall options but still enables you to do many of the operations that you need.

To explore these options, you can use user-specific cluster file storage, called `userfiles`, to do import, backup and restore.

In these labs, you will learn how to import data from CSV files, Postgresql and MySQL leveraging `userfiles` into your Cockroach Cloud free tier cluster. You will also learn how to backup and restore an entire cluster, a database or a single table. 

## Labs Prerequisites

1. Connection URL to the Cockroach Cloud Free Tier

2. You also need:

    - a modern web browser,
    - [Cockroach SQL client](https://www.cockroachlabs.com/docs/stable/install-cockroachdb-linux)

3. Optional:

    - [Docker Desktop](https://www.docker.com/products/docker-desktop). We will use Docker Desktop to create Postgresql and MySQL database dumps. If you prefer, you can use existing database dumps provided in the workshops data directory.

## Lab 1 - Managing Cluster File Storage

Before getting started with the import, backup and restore labs, you will want to be familiar with interacting with the user-specific cluster storage called `userfiles`. Cockroach Cloud supports the following commands for managing cluster `userfiles`:

* `cockroach userfile upload`
* `cockroach userfile list`
* `cockroach userfile get`
* `cockroach userfile delete`

To try out these commands, download the `employees.csv` file from the `data/import-backup-restore` directory. You will use this `userfile` in the next lab when you explore importing data from CSV.

After downloading the `employees.csv` file to your local machine, upload it into your cluster with the following command. Note that you can exclude the database name in the `--url` parameter since it does not affect where the `userfile` is stored.

```bash
# upload data file to cluster
$ cockroach userfile upload employees.csv --url "postgresql://<yourname>:<password>@[...]"
successfully uploaded to userfile://defaultdb.public.userfiles_jon/
```

The `userfile` path is returned after the file is successfully uploaded. The `userfile` is stored in a per-user space. In this example, the username was `jon` so the path includes it in the path.

To view all of the userfiles that you have uploaded, you can run the following command:

```bash
# list data files in cluster
$ cockroach userfile list --url "postgresql://<yourname>:<password>@[...]"
employees.csv
```

To download the `userfile`, change to a directory where the file does not exist and run the following command:

```bash
# change directories
$ cd ~
$ cockroach userfile get employees.csv --url "postgresql://<yourname>:<password>@[...]"
downloaded employees.csv to employees.csv (4.4 KiB)
```

Finally, to delete the `userfile` run the following command:

```bash
# delete user file
$ cockroach userfile delete employees.csv --url "postgresql://<yourname>:<password>@[...]"
successfully deleted employees.csv
```

These are all of the commands that you will need to know to leverage `userfiles` in the following labs.


## Lab 2 - Import Data from CSV

In this lab, we will look at how to import data from comma-separated value (CSV) files. To accomplish this, you will import two existing CSV files that has been provided for this workshop. The employee CSV contains records for 100 employees, including their employee number, birth date, first name, last name, gender and hire date. The rooms CSV contains records for conference rooms, including the room number, name and capacity.

First, download the `employees.csv` and `rooms.csv` files from the `data/import-backup-restore` directory.

Next, upload the CSV files to your Cockroach Cloud cluster as `userfiles`. As described in the first lab, a `userfile` is stored in user-specific file space on the cluster.

```bash
# upload data files to cluster
$ cockroach userfile upload employees.csv --url "postgresql://<yourname>:<password>@[...]"
$ cockroach userfile upload rooms.csv --url "postgresql://<yourname>:<password>@[...]"

# verify that files have been uploaded
$ cockroach userfile list --url "postgresql://<yourname>:<password>@[...]"
```

After the files have been uploaded, connect to your cluster using the command-line `cockroach sql` command so that we can import the CSVs into a database table.

```bash
# connect to the CockroachDB cluster
$ cockroach sql --url "postgresql://<yourname>:<password>@[...]"
```

Once you are connect to the cluster via the SQL client, you can create a database for storing the imported tables called `workplace_csv`.

```sql
> CREATE DATABASE workplace_csv;
```

Next, switch to the `workplace_csv` database and run the `IMPORT TABLE` command. To import data from the CSV files, the table schema must be defined to match the number of columns in the CSV file.

```sql
> USE workplace_csv;

> IMPORT TABLE employees_csv (
    emp_no INT PRIMARY KEY,
    birth_date DATE NOT NULL,
    first_name STRING NOT NULL,
    last_name STRING NOT NULL,
    gender STRING NOT NULL,
    hire_date DATE NOT NULL
  ) CSV DATA ("userfile://defaultdb.public.userfiles_$user/employees.csv");

        job_id       |  status   | fraction_completed | rows | index_entries | bytes
---------------------+-----------+--------------------+------+---------------+--------
  682252763719575313 | succeeded |                  1 |  100 |             0 |  4275
(1 row)

Time: 388ms

> IMPORT TABLE rooms_csv (
    room_no INT PRIMARY KEY,
    name STRING NOT NULL,
    capacity INT NOT NULL
  ) CSV DATA ("userfile://defaultdb.public.userfiles_$user/rooms.csv");

        job_id       |  status   | fraction_completed | rows | index_entries | bytes
---------------------+-----------+--------------------+------+---------------+--------
  682252774955460369 | succeeded |                  1 |    6 |             0 |   148
(1 row)

Time: 732ms
```

Once the import is completed, you can view the imported table and select a handful of rows from the table to verify that the data was successfully imported.

```sql
> SHOW TABLES;

> SELECT * FROM employees_csv limit 10;
> SELECT * FROM rooms_csv limit 10;
```

Congratulations! You have just imported CSV files into your Cockroach Cloud cluster!

## Lab 3 - Import Data from Postgresql

Often we want to import data that is exported directly from a database system. Cockroach Cloud supports importing data from a number of different databases and file types.

In this lab, we'll demonstrate how data can be imported from a Postgresql data dump.

Note: if you would like to skip creating a docker container and doing the dump in Postgresql, you can skip this section and use the full database dump `workplace_pg.sql` and the single table dump `employees_pg.sql` found in the `data/import-backup-restore` folder.

Let's start a docker instance and copy the employee CSV data to it:

```bash
# Run a postgresql container
$ docker run --name import-postgres -e POSTGRES_PASSWORD=test1234 -d postgres

# Copy the CSV files to the container
$ docker cp employees.csv import-postgres:/employees.csv
$ docker cp rooms.csv import-postgres:/rooms.csv
```

and connect to it:
```bash
# Get shell in container
$ docker exec -it import-postgres /bin/bash
```

You should now see a command-prompt that is in the PostgreSQL container. To connect to the database:
```bash
$$ psql -U postgres
```

Next, import the CSV data into a new PostgreSQL database and table:

```sql
-- Create the database
PGSQL> CREATE DATABASE workplace_pg;

CREATE DATABASE

-- Connnect to the database
PGSQL> \c workplace_pg

You are now connected to database "workplace_pg" as user "postgres".

-- Create the employees table
PGSQL> CREATE TABLE employees_pg (
    emp_no INT PRIMARY KEY,
    birth_date DATE NOT NULL,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    gender VARCHAR NOT NULL,
    hire_date DATE NOT NULL
);

CREATE TABLE

-- Import the CSV
PGSQL> COPY employees_pg FROM '/employees.csv' WITH (FORMAT csv);

COPY 100

-- Create the rooms table
PGSQL> CREATE TABLE rooms_pg (
    room_no INT PRIMARY KEY,
    name VARCHAR NOT NULL,
    capacity INT NOT NULL
);

CREATE TABLE

-- Import the CSV
PGSQL> COPY rooms_pg FROM '/rooms.csv' WITH (FORMAT csv);

COPY 6

-- Show tables
PGSQL> \d

           List of relations
 Schema |   Name    | Type  |  Owner
--------+-----------+-------+----------
 public | employees_pg | table | postgres
 public | rooms_pg | table | postgres
(2 rows)

-- Select 10 rows to ensure the data is populated
PGSQL> SELECT * FROM employees_pg LIMIT 10;
PGSQL> SELECT * FROM rooms_pg LIMIT 10;
```

Exit out of Postgresql.

```sql
PGSQL> \q
```

At the shell prompt in the PostgreSQL container, dump the full database using `pg_dump`:

```bash
$$ pg_dump -U postgres workplace_pg > /workplace_pg.sql
```

In addition to the full database, we'll also dump the database table so that we can demonstrate importing either the full database or an individual table:

```bash
$$ pg_dump -U postgres -t employees_pg workplace_pg > /employees_pg.sql
```

Exit out of the Postgresql container and copy the dumps from the docker container to your computer:

```bash
$$ exit
$ docker cp import-postgres:/workplace_pg.sql .
$ docker cp import-postgres:/employees_pg.sql .
```

Using the `cockroach userfile upload` command, upload the dumps to your cluster:

```bash
# upload pg_dump
$ cockroach userfile upload workplace_pg.sql --url "postgresql://<yourname>:<password>@[...]"
$ cockroach userfile upload employees_pg.sql --url "postgresql://<yourname>:<password>@[...]"
```

Next, verify that the files have been successfully upload.

```bash
# verify that file has been uploaded
$ cockroach userfile list --url "postgresql://<yourname>:<password>@[...]"
```

Connect to your cluster to perform the import.

```bash
# now connect to the CockroachDB cluster
$ cockroach sql --url "postgresql://<yourname>:<password>@[...]"
```

To import the `workplace` database, we must first create the database.

```sql
> CREATE DATABASE workplace_pg;

CREATE DATABASE

Time: 86ms

> USE workplace_pg;

SET

Time: 56ms

> IMPORT PGDUMP "userfile://defaultdb.public.userfiles_$user/workplace_pg.sql" WITH ignore_unsupported_statements;

        job_id       |  status   | fraction_completed | rows | index_entries | bytes
---------------------+-----------+--------------------+------+---------------+--------
  682255554362582801 | succeeded |                  1 |  106 |             0 |  4423
(1 row)

Time: 750ms

> SHOW TABLES;

  schema_name |  table_name   | type  | owner | estimated_row_count | locality
--------------+---------------+-------+-------+---------------------+-----------
  public      | employees_pg  | table | jon   |                 100 | NULL
  public      | rooms_pg      | table | jon   |                 100 | NULL
(2 rows)

> SELECT * FROM employees_pg limit 10;

  emp_no | birth_date | first_name | last_name | gender | hire_date
---------+------------+------------+-----------+--------+-------------
   10001 | 1953-09-02 | Georgi     | Facello   | M      | 1986-06-26
   10002 | 1964-06-02 | Bezalel    | Simmel    | F      | 1985-11-21
   10003 | 1959-12-03 | Parto      | Bamford   | M      | 1986-08-28
   10004 | 1954-05-01 | Chirstian  | Koblick   | M      | 1986-12-01
   10005 | 1955-01-21 | Kyoichi    | Maliniak  | M      | 1989-09-12
   10006 | 1953-04-20 | Anneke     | Preusig   | F      | 1989-06-02
   10007 | 1957-05-23 | Tzvetan    | Zielinski | F      | 1989-02-10
   10008 | 1958-02-19 | Saniya     | Kalloufi  | M      | 1994-09-15
   10009 | 1952-04-19 | Sumant     | Peac      | F      | 1985-02-18
   10010 | 1963-06-01 | Duangkaew  | Piveteau  | F      | 1989-08-24
(10 rows)

> SELECT * FROM rooms_pg;

  room_no |   name   | capacity
----------+----------+-----------
        1 | Austin   |       25
        2 | Phoenix  |       15
        3 | Portland |       10
        4 | Boston   |       30
        5 | Seattle  |       12
        6 | London   |       18
(6 rows)

Time: 70ms
```

Next, let's look at importing just a single table.

Drop the `employees_pg` table and then import from the single table dump:

```sql
> DROP TABLE employees_pg;

DROP TABLE

Time: 314ms

> IMPORT TABLE employees_pg FROM PGDUMP "userfile://defaultdb.public.userfiles_$user/employees_pg.sql" WITH ignore_unsupported_statements;

        job_id       |  status   | fraction_completed | rows | index_entries | bytes
---------------------+-----------+--------------------+------+---------------+--------
  680265700589741841 | succeeded |                  1 |  100 |             0 |  4175
(1 row)

Time: 520ms

> SHOW TABLES;

  schema_name |  table_name   | type  | owner | estimated_row_count | locality
--------------+---------------+-------+-------+---------------------+-----------
  public      | employees_pg  | table | jon   |                 100 | NULL
  public      | rooms_pg      | table | jon   |                 100 | NULL
(2 rows)

> SELECT * FROM employees_pg limit 10;

  emp_no | birth_date | first_name | last_name | gender | hire_date
---------+------------+------------+-----------+--------+-------------
   10001 | 1953-09-02 | Georgi     | Facello   | M      | 1986-06-26
   10002 | 1964-06-02 | Bezalel    | Simmel    | F      | 1985-11-21
   10003 | 1959-12-03 | Parto      | Bamford   | M      | 1986-08-28
   10004 | 1954-05-01 | Chirstian  | Koblick   | M      | 1986-12-01
   10005 | 1955-01-21 | Kyoichi    | Maliniak  | M      | 1989-09-12
   10006 | 1953-04-20 | Anneke     | Preusig   | F      | 1989-06-02
   10007 | 1957-05-23 | Tzvetan    | Zielinski | F      | 1989-02-10
   10008 | 1958-02-19 | Saniya     | Kalloufi  | M      | 1994-09-15
   10009 | 1952-04-19 | Sumant     | Peac      | F      | 1985-02-18
   10010 | 1963-06-01 | Duangkaew  | Piveteau  | F      | 1989-08-24
(10 rows)
```

Nice work! We were able to re-import just the `employees_pg` table.

## Lab 4 - Import Data from MySQL

Importing data from MySQL is very similar to importing data from Postgresql.

In this lab, we'll demonstrate how data can be imported from a MySQL data dump.

Note: if you would like to skip creating a docker container and doing the dump in MySQL, you can skip this section and use the full database dump `workplace_mysql.sql` and the single table dump `employees_mysql.sql` found in the `data/import-backup-restore` folder.

Let's start a docker instance and copy the CSV data to it:

```bash
# Run a mysql container
$ docker run --name import-mysql -e MYSQL_ROOT_PASSWORD=test1234 -d mysql --secure-file-priv=/

# Copy the CSV files to the container
$ docker cp employees.csv import-mysql:/employees.csv
$ docker cp rooms.csv import-mysql:/rooms.csv
```

and connect to it:
```bash
# Get shell in container
$ docker exec -it import-mysql /bin/bash
```

You should now see a command-prompt that is in the MySQL container. To connect to the database:
```bash
$$ mysql -u root -ptest1234
```

Next, import the CSV data into a new MySQL database and table:

```sql
-- Create the database
MYSQL> CREATE DATABASE workplace_mysql;
Query OK, 1 row affected (0.00 sec)

-- Connnect to the database
MYSQL> USE workplace_mysql
Database changed

-- Create the employees table
MYSQL> CREATE TABLE employees_mysql (
    emp_no INT PRIMARY KEY,
    birth_date DATE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL
);
Query OK, 0 rows affected (0.02 sec)

-- Import the CSV
MYSQL> LOAD DATA INFILE '/employees.csv' INTO TABLE employees_mysql FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n';
Query OK, 100 rows affected (0.01 sec)
Records: 100  Deleted: 0  Skipped: 0  Warnings: 0

-- Create the rooms table
MYSQL> CREATE TABLE rooms_mysql (
    room_no INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL
);
Query OK, 0 rows affected (0.02 sec)

-- Import the CSV
MYSQL> LOAD DATA INFILE '/rooms.csv' INTO TABLE rooms_mysql FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n';
Query OK, 100 rows affected (0.01 sec)
Query OK, 6 rows affected (0.00 sec)
Records: 6  Deleted: 0  Skipped: 0  Warnings: 0

-- Show tables
MYSQL> SHOW TABLES;
+---------------------------+
| Tables_in_workplace_mysql |
+---------------------------+
| employees_mysql           |
| rooms_mysql               |
+---------------------------+
2 rows in set (0.00 sec)

-- Select 10 rows to ensure the data is populated
MYSQL> SELECT * FROM employees_mysql LIMIT 10;
MYSQL> SELECT * FROM rooms_mysql LIMIT 10;
```

Exit out of MySQL.

```sql
MYSQL> exit;
```

At the shell prompt in the MySQL container, dump the full database using `mysql_dump`.

```bash
$$ mysqldump -u root -ptest1234 workplace_mysql > workplace_mysql.sql
```

In addition to the full database, we'll also dump the database table so that we can demonstrate importing either the full database or an individual table:

```bash
$$ mysqldump -u root -ptest1234 workplace_mysql employees_mysql > employees_mysql.sql
```

Exit out of the MySQL container and copy the dumps from the docker container to your computer:

```bash
$$ exit
$ docker cp import-mysql:/workplace_mysql.sql .
$ docker cp import-mysql:/employees_mysql.sql .
```

Using the `cockroach userfile upload` command, upload the dumps to your cluster:

```bash
# upload mysql dump
$ cockroach userfile upload workplace_mysql.sql --url "postgresql://<yourname>:<password>@[...]"
$ cockroach userfile upload employees_mysql.sql --url "postgresql://<yourname>:<password>@[...]"
```

Next, verify that the files have been successfully upload.

```bash
# verify that file has been uploaded
$ cockroach userfile list --url "postgresql://<yourname>:<password>@[...]"
```

Connect to your cluster to perform the import.

```bash
# now connect to the CockroachDB cluster
$ cockroach sql --url "postgresql://<yourname>:<password>@[...]"
```

To import the `workplace_mysql` database, we must first create the database.

```sql
> CREATE DATABASE workplace_mysql;

CREATE DATABASE

Time: 86ms

> USE workplace_mysql;

SET

Time: 56ms

> IMPORT MYSQLDUMP "userfile://defaultdb.public.userfiles_$user/workplace_mysql.sql";

        job_id       |  status   | fraction_completed | rows | index_entries | bytes
---------------------+-----------+--------------------+------+---------------+--------
  682263483122460433 | succeeded |                  1 |  106 |             0 |  4423
(1 row)

Time: 743ms

> SHOW TABLES;

  schema_name |   table_name    | type  | owner | estimated_row_count | locality
--------------+-----------------+-------+-------+---------------------+-----------
  public      | employees_mysql | table | jon   |                   0 | NULL
  public      | rooms_mysql     | table | jon   |                   0 | NULL
(2 rows)

> SELECT * FROM employees_mysql limit 10;

  emp_no | birth_date | first_name | last_name | gender | hire_date
---------+------------+------------+-----------+--------+-------------
   10001 | 1953-09-02 | Georgi     | Facello   | M      | 1986-06-26
   10002 | 1964-06-02 | Bezalel    | Simmel    | F      | 1985-11-21
   10003 | 1959-12-03 | Parto      | Bamford   | M      | 1986-08-28
   10004 | 1954-05-01 | Chirstian  | Koblick   | M      | 1986-12-01
   10005 | 1955-01-21 | Kyoichi    | Maliniak  | M      | 1989-09-12
   10006 | 1953-04-20 | Anneke     | Preusig   | F      | 1989-06-02
   10007 | 1957-05-23 | Tzvetan    | Zielinski | F      | 1989-02-10
   10008 | 1958-02-19 | Saniya     | Kalloufi  | M      | 1994-09-15
   10009 | 1952-04-19 | Sumant     | Peac      | F      | 1985-02-18
   10010 | 1963-06-01 | Duangkaew  | Piveteau  | F      | 1989-08-24
(10 rows)

> SELECT * FROM rooms_mysql;

  room_no |   name   | capacity
----------+----------+-----------
        1 | Austin   |       25
        2 | Phoenix  |       15
        3 | Portland |       10
        4 | Boston   |       30
        5 | Seattle  |       12
        6 | London   |       18
(6 rows)

Time: 70ms
```

Next, let's look at importing just a single table.

Drop the `employees_mysql` table and then import from the single table dump:

```sql
> DROP TABLE employees_mysql;

DROP TABLE

Time: 314ms

> IMPORT TABLE employees_mysql FROM MYSQLDUMP "userfile://defaultdb.public.userfiles_$user/employees_mysql.sql";

        job_id       |  status   | fraction_completed | rows | index_entries | bytes
---------------------+-----------+--------------------+------+---------------+--------
  682264036549469969 | succeeded |                  1 |  100 |             0 |  4275
(1 row)

Time: 828ms

> SHOW TABLES;

  schema_name |  table_name   | type  | owner | estimated_row_count | locality
--------------+---------------+-------+-------+---------------------+-----------
  public      | employees_mysql  | table | jon   |                 100 | NULL
  public      | rooms_mysql      | table | jon   |                 100 | NULL
(2 rows)

> SELECT * FROM employees_mysql limit 10;

  emp_no | birth_date | first_name | last_name | gender | hire_date
---------+------------+------------+-----------+--------+-------------
   10001 | 1953-09-02 | Georgi     | Facello   | M      | 1986-06-26
   10002 | 1964-06-02 | Bezalel    | Simmel    | F      | 1985-11-21
   10003 | 1959-12-03 | Parto      | Bamford   | M      | 1986-08-28
   10004 | 1954-05-01 | Chirstian  | Koblick   | M      | 1986-12-01
   10005 | 1955-01-21 | Kyoichi    | Maliniak  | M      | 1989-09-12
   10006 | 1953-04-20 | Anneke     | Preusig   | F      | 1989-06-02
   10007 | 1957-05-23 | Tzvetan    | Zielinski | F      | 1989-02-10
   10008 | 1958-02-19 | Saniya     | Kalloufi  | M      | 1994-09-15
   10009 | 1952-04-19 | Sumant     | Peac      | F      | 1985-02-18
   10010 | 1963-06-01 | Duangkaew  | Piveteau  | F      | 1989-08-24
(10 rows)
```

Nice work! We were able to re-import just the `employees_mysql` table.


## Lab 5 - Backup and Restore Data on a Single Cluster

Cockroach Cloud Free Tier automatically backs up all clusters but those backups are not currently available via the cluster console. However, you can create manual database and table backups to `userfiles` that can be used to restore database and table data. Although Cockroach Cloud Free Tier supports manual full cluster backups to `userfiles`, those imports can only be imported into CockroachDB self-hosted or Cockroach Cloud non-free tier.

To learn more about `userfiles`, review Lab 1 of this workshops that focuses on how to manage `userfiles`.

https://www.cockroachlabs.com/docs/cockroachcloud/free-faqs.html#can-i-backup-my-cockroachcloud-free-beta-cluster-does-cockroach-labs-take-backups-of-my-cluster

To do a full cluster backup, first login to your cluster.

```bash
# connect to the CockroachDB cluster
$ cockroach sql --url "postgresql://<yourname>:<password>@[...]"
```

Once you are connected to your cluster, issue the following SQL which will create a backup called `full-backup` in `userfiles`.

```sql
> BACKUP INTO 'userfile://defaultdb.public.userfiles_$user/full-backup' AS OF  SYSTEM TIME '-10s';

        job_id       |  status   | fraction_completed | rows  | index_entries |  bytes
---------------------+-----------+--------------------+-------+---------------+-----------
  682009176526923537 | succeeded |                  1 | 11204 |          1055 | 19883414
(1 row)

Time: 24.588s
```

On your local machine, you can use the following command to download the full backup.

```bash
$ cockroach userfile get full-backup --url "postgresql://<yourname>:<password>@[...]"
```

To backup a single database rather than the full cluster, you can re-connect to your cluster and execute the following command.

```sql
> BACKUP DATABASE workplace INTO 'userfile://defaultdb.public.userfiles_jon/workplace-backup' AS OF  SYSTEM TIME '-10s';
        job_id       |  status   | fraction_completed | rows | index_entries | bytes
---------------------+-----------+--------------------+------+---------------+--------
  682009822370211601 | succeeded |                  1 |  200 |             0 |  8350
(1 row)

Time: 12.407s
```

Additionally, you can backupk a single table using the following command.

```sql
> BACKUP workplace.employees INTO 'userfile://defaultdb.public.userfiles_jon/employees-backup' AS OF  SYSTEM TIME '-10s';
        job_id       |  status   | fraction_completed | rows | index_entries | bytes
---------------------+-----------+--------------------+------+---------------+--------
  682009558332090129 | succeeded |                  1 |  100 |             0 |  4175
(1 row)

Time: 11.902s
```

## Lab 5 - Restoring Data to a Running Cluster

In this lab, you will restore previously backed-up data to a running cluster. Cockroach Cloud Free Tier currently supports restoring data from both database and table backups.

First, identify the backup you would like to restore. In Lab 4, you used the `AS OF SYSTEM TIME` option. This creates a backup with a specific timestamp. To find the backup, get a list of `userfiles`.

```bash
$ cockroach userfile list --url "postgresql://<yourname>:<password>@[...]"

employees-backup/2021/08/05-223949.67/BACKUP-CHECKPOINT-682009558332090129-CHECKSUM
employees-backup/2021/08/05-223949.67/BACKUP-CHECKPOINT-CHECKSUM
employees-backup/2021/08/05-223949.67/BACKUP-STATISTICS
employees-backup/2021/08/05-223949.67/BACKUP_MANIFEST
employees-backup/2021/08/05-223949.67/BACKUP_MANIFEST-CHECKSUM
employees-backup/2021/08/05-223949.67/data/682009573653030673.sst
employees-backup/2021/08/09-175151.88/BACKUP-CHECKPOINT-683085404549359377-CHECKSUM
employees-backup/2021/08/09-175151.88/BACKUP-CHECKPOINT-CHECKSUM
employees-backup/2021/08/09-175151.88/BACKUP-STATISTICS
employees-backup/2021/08/09-175151.88/BACKUP_MANIFEST
employees-backup/2021/08/09-175151.88/BACKUP_MANIFEST-CHECKSUM
employees-backup/2021/08/09-175151.88/data/683085420552431377.sst
full-backup/2021/08/09-175623.91/BACKUP-CHECKPOINT
full-backup/2021/08/09-175623.91/BACKUP-CHECKPOINT-683086295814416145-CHECKSUM
full-backup/2021/08/09-175623.91/BACKUP-CHECKPOINT-CHECKSUM
full-backup/2021/08/09-175623.91/data/683086311490823953.sst
full-backup/2021/08/09-175623.91/data/683086311490922257.sst
full-backup/2021/08/09-175623.91/data/683086311491446545.sst
full-backup/2021/08/09-175623.91/data/683086311492462353.sst
full-backup/2021/08/09-175623.91/data/683086311500097297.sst
full-backup/2021/08/09-175623.91/data/683086328509802257.sst
full-backup/2021/08/09-175623.91/data/683086328511309585.sst
full-backup/2021/08/09-175623.91/data/683086328512685841.sst
full-backup/2021/08/09-175623.91/data/683086328531199761.sst
full-backup/2021/08/09-175623.91/data/683086328832829201.sst
full-backup/2021/08/09-175623.91/data/683086336381724433.sst
full-backup/2021/08/09-175623.91/data/683086341627225873.sst
full-backup/2021/08/09-175623.91/data/683086341926332177.sst
full-backup/2021/08/09-175623.91/data/683086343249110801.sst
full-backup/2021/08/09-175623.91/data/683086343250126609.sst
full-backup/2021/08/09-175623.91/data/683086349465298705.sst
full-backup/2021/08/09-175623.91/data/683086359236323089.sst
full-backup/2021/08/09-175623.91/data/683086370109237009.sst
full-backup/2021/08/09-175623.91/data/683086370109269777.sst
full-backup/2021/08/09-175623.91/data/683086370109466385.sst
workplace-backup/2021/08/05-224110.23/BACKUP-CHECKPOINT-682009822370211601-CHECKSUM
workplace-backup/2021/08/05-224110.23/BACKUP-CHECKPOINT-CHECKSUM
workplace-backup/2021/08/05-224110.23/BACKUP-STATISTICS
workplace-backup/2021/08/05-224110.23/BACKUP_MANIFEST
workplace-backup/2021/08/05-224110.23/BACKUP_MANIFEST-CHECKSUM
workplace-backup/2021/08/05-224110.23/data/682009837124003601.sst
workplace-backup/2021/08/05-224110.23/data/682009837124036369.sst
workplace-backup/2021/08/09-175343.68/BACKUP-CHECKPOINT-683085770857555729-CHECKSUM
workplace-backup/2021/08/09-175343.68/BACKUP-CHECKPOINT-CHECKSUM
workplace-backup/2021/08/09-175343.68/BACKUP-STATISTICS
workplace-backup/2021/08/09-175343.68/BACKUP_MANIFEST
workplace-backup/2021/08/09-175343.68/BACKUP_MANIFEST-CHECKSUM
workplace-backup/2021/08/09-175343.68/data/683085785954395921.sst
workplace-backup/2021/08/09-175343.68/data/683085785954428689.sst
```

This list shows that I have 2 `employees` table backups, 2 `workplace` database backups and 1 full cluster backup.

Let's start by restoring the `employee` table. Login to your cluster.

```bash
$ cockroach sql --url "postgresql://<yourname>:<password>@[...]"
```

And drop the `employees` table in the `workplace` database.

```sql
> USE workplace;
> DROP TABLE employees;
DROP TABLE

Time: 350ms
```

Then run the `RESTORE` command on the latest backup.

```sql
> RESTORE TABLE workplace.employees FROM 'userfile:///employees-backup//2021/08/09-175151.88';
        job_id       |  status   | fraction_completed | rows | index_entries | bytes
---------------------+-----------+--------------------+------+---------------+--------
  683091868975376145 | succeeded |                  1 |  100 |             0 |  4275
(1 row)

Time: 880ms
```

Nice work! The `employees` table has been successfully restored.

Next, change databases so the `workplace` database is not active and drop the entire `workplace` database. You will also need to disable `sql_safe_updates`.

```sql
> USE defaultdb;
SET

Time: 57ms

> SET sql_safe_updates=false;
SET

Time: 57ms

> DROP DATABASE workplace;
DROP DATABASE

Time: 438ms

> SET sql_safe_updates=true;
SET

Time: 59ms

```

Next, restore the full database.

```sql
> RESTORE DATABASE workplace FROM 'userfile:///workplace-backup/2021/08/09-175343.68';

        job_id       |  status   | fraction_completed | rows | index_entries | bytes
---------------------+-----------+--------------------+------+---------------+--------
  683092806126282513 | succeeded |                  1 |  200 |             0 |  8550
(1 row)

Time: 1.054s
```

Congratulations! You have just successfully restored a full database backup.

## Lab 6 - Migrate Free-Tier Data to a Non-Free Tier Cluster

