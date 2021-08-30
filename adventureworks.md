# Adventureworks - an example web application 

## Overview

Adventureworks is a fictitious cycle products company used as the basis for a number of demos for SQL Server. As you can see from the full schema diagram below there are a lot of tables (and this is just the OLTP schemas!!)


We will work with a small subset of the tables with the ultimate aim of constructing an interactive website. The application will run in Docker (or Kubernetes if you prefer) with the backend database being stored on Cockroach Cloud Free. 

In the first section we will use a PostgreSQL version of Adventureworks to step through the process of schema conversion  and deployment onto Cockroach Cloud Free. 
We will then load some sample data into the schema objects and construct the SQL statements required for the website interactions.
A prototype of the application has been written in Python so we will look at how to connect to the adventureworks database and execute the SQL interactions using the psycopg2 driver.
   

## Labs Prerequisites

1. Connection URL to the Cockroach Cloud Free Tier

2. You also need:

    - a modern web browser,
    - [Cockroach SQL client](https://www.cockroachlabs.com/docs/stable/install-cockroachdb-linux)

3. Optional:

    - [Docker Desktop](https://www.docker.com/products/docker-desktop). You will use Docker Desktop to run Python and the prototype web application. If you prefer you can use Python on your local machine for the connection and SQL interaction exercises, but you will need Docker (or access to a Kubernetes cluster) to run the prototype application.

## Lab 1 - Connecting to CC Free Tier

Firstly let's get comfortable connecting to your Free Tier cluster with both cockroach sql and with the psycopg2 driver in Python 3.

Create an admin SQL user called aw_admin :
* Login to the Cockroach Cloud dashboard
* Navigate to your cluster
* Click on SQL Users on the left and click Add User
* Use the following details -  Username: aw_admin  Password: <your choice>


We will be setting the COCKROACH_URL environment variable so that we don't have to use the --url option with every command. 
We will need to use a format for the URL initially that doesn't specify a database name - this is because we need to upload some csv files and the cockroach upload command fails if we do specify a database. 
Replace <password>, <address> and <cluster-name> with the details for your setup.

```bash
# Linux / Mac
> export COCKROACH_URL="postgresql://aw_admin:<password>@<address>:26257?sslmode=require&options=--cluster=<cluster-name>"

# Windows Powershell
> $Env:COCKROACH_URL = "postgresql://aw_admin:<password>@<address>:26257?sslmode=require&options=--cluster=<cluster-name>"
```
Now we can issue cockroach commands like this ...

```bash
# Connect to the SQL shell
cockroach sql

# List uploaded files
cockroach userfile list
```

To run python you can either install python directly on your machine or use Docker to run a python image as a container.


## Lab 2 - Create and Import the Adventureworks Schema

In this lab, we will create a database and 2 schemas and then import data from comma-separated value (CSV) files.

First, download the 9 csv files from the `data/adventureworks/import-backup-restore` directory.

Next, upload the CSV files to your Cockroach Cloud cluster as `userfiles`.

> The following commands assume that you have defined the COCKROACH_URL environment variable as we did in the previous Lab

```bash
# upload data files to cluster
$ cockroach userfile upload pmpdc.csv 
$ cockroach userfile upload productsubcategory.csv 
$ cockroach userfile upload product.csv 
$ cockroach userfile upload productphoto.csv 
$ cockroach userfile upload productproductphoto.csv 
$ cockroach userfile upload productdescription.csv
$ cockroach userfile upload productreview.csv 
$ cockroach userfile upload specialoffer.csv 
$ cockroach userfile upload specialofferproduct.csv 

# verify that files have been uploaded
$ cockroach userfile list 
```

After the files have been uploaded, connect to your cluster using the command-line `cockroach sql` command so that you can import the CSVs into a database table.

```bash
# connect to the CockroachDB cluster
$ cockroach sql
```

Once you are connected to the cluster via the SQL client, you can create a database for storing the imported tables called `adventureworks`.

```sql
> CREATE DATABASE adventureworks;
```

Next, switch to the `adventureworks` database and run the following SQL commands. 
In order to successfully import data from the CSV files, the table schema must be defined to match the number and order of columns in the CSV file.
You can also pre-create the table using `CREATE TABLE` and import the csv files using the `IMPORT INTO` command, but this currently doesn't work with the Free Tier.
One other limitation with the Free Tier is that we can't directly import into a table in a user-defined schema so we will create and import the table in the public schema and then migrate the table to the desired schema (products or sales) using the ALTER TABLE ... SET SCHEMA command.

```sql
> USE adventureworks;
> create schema production;
> create schema sales;

IMPORT TABLE productsubcategory (
      productsubcategoryid INT8 NOT NULL DEFAULT unique_rowid() PRIMARY KEY,
      productcategoryid INT8 NOT NULL,
      name VARCHAR(50) NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP
  ) CSV DATA ("userfile://defaultdb.public.userfiles_aw_admin/productsubcategory.csv");
ALTER TABLE productsubcategory SET SCHEMA production;

IMPORT TABLE product (
      productid INT8 NOT NULL DEFAULT unique_rowid(),
      name VARCHAR(50) NOT NULL,
      productnumber VARCHAR(25) NOT NULL,
      color VARCHAR(15) NULL,
      listprice DECIMAL NOT NULL,
      size VARCHAR(5) NULL,
      sizeunitmeasurecode CHAR(3) NULL,
      weightunitmeasurecode CHAR(3) NULL,
      weight DECIMAL(8,2) NULL,
      productsubcategoryid INT8 NULL,
      productmodelid INT8 NULL,
      sellstartdate TIMESTAMP NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      CONSTRAINT "primary" PRIMARY KEY (productid ASC),
      INDEX product_productsubcategoryid (productsubcategoryid ASC),
      INDEX product_productnumber (productnumber ASC),
      CONSTRAINT "CK_Product_ListPrice" CHECK (listprice >= 0.00:::DECIMAL)
  ) CSV DATA ("userfile://defaultdb.public.userfiles_aw_admin/product.csv") WITH delimiter = '|';
ALTER TABLE product SET SCHEMA production;
UPDATE production.product SET weight=null WHERE weight=0.0;
UPDATE production.product SET color=null WHERE color='';
UPDATE production.product SET size=null WHERE size='';

IMPORT TABLE productphoto (
      productphotoid INT8 NOT NULL DEFAULT unique_rowid() PRIMARY KEY,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      image_name VARCHAR(96) NULL
  ) CSV DATA ("userfile://defaultdb.public.userfiles_aw_admin/productphoto.csv");
ALTER TABLE productphoto SET SCHEMA production;

IMPORT TABLE productproductphoto (
      productid INT8 NOT NULL,
      productphotoid INT8 NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      CONSTRAINT "primary" PRIMARY KEY (productid ASC, productphotoid ASC)
  ) CSV DATA ("userfile://defaultdb.public.userfiles_aw_admin/productproductphoto.csv");
ALTER TABLE productproductphoto SET SCHEMA production;

IMPORT TABLE productreview (
      productreviewid INT8 NOT NULL PRIMARY KEY,
      productid INT8 NOT NULL,
      reviewername VARCHAR(50) NOT NULL,
      reviewdate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      emailaddress VARCHAR(50) NOT NULL,
      rating INT8 NOT NULL,
      comments VARCHAR(3850) NULL,
      modifieddate TIMESTAMP NULL DEFAULT now():::TIMESTAMP,
      INDEX productreview_productid (productid ASC),
      CONSTRAINT "CK_ProductReview_Rating" CHECK ((rating >= 1:::INT8) AND (rating <= 5:::INT8))
  ) CSV DATA ("userfile://defaultdb.public.userfiles_aw_admin/productreview.csv") WITH delimiter = '|';
ALTER TABLE productreview SET SCHEMA production;

IMPORT TABLE productmodelproductdescriptionculture (
      productmodelid INT8 NOT NULL,
      productdescriptionid INT8 NOT NULL,
      cultureid CHAR(6) NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      CONSTRAINT "primary" PRIMARY KEY (productmodelid ASC, cultureid ASC),
      INDEX productmodelproductdescriptionculture_productdescription (productdescriptionid ASC)
  ) CSV DATA ("userfile://defaultdb.public.userfiles_aw_admin/pmpdc.csv");
ALTER TABLE productmodelproductdescriptionculture SET SCHEMA production;

IMPORT TABLE productdescription (
      productdescriptionid INT8 NOT NULL,
      description VARCHAR(400) NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      CONSTRAINT "primary" PRIMARY KEY (productdescriptionid ASC)
  ) CSV DATA ("userfile://defaultdb.public.userfiles_aw_admin/productdescription.csv") WITH delimiter = '|';
ALTER TABLE productdescription SET SCHEMA production;

IMPORT TABLE specialoffer (
      specialofferid INT8 NOT NULL,
      description VARCHAR(255) NOT NULL,
      discountpct DECIMAL NOT NULL DEFAULT 0.00:::DECIMAL,
      type VARCHAR(50) NOT NULL,
      category VARCHAR(50) NOT NULL,
      startdate TIMESTAMP NOT NULL,
      enddate TIMESTAMP NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      CONSTRAINT "primary" PRIMARY KEY (specialofferid ASC),
      CONSTRAINT "CK_SpecialOffer_DiscountPct" CHECK (discountpct >= 0.00:::DECIMAL),
      CONSTRAINT "CK_SpecialOffer_EndDate" CHECK (enddate >= startdate)
  ) CSV DATA ("userfile://defaultdb.public.userfiles_aw_admin/specialoffer.csv");
ALTER TABLE specialoffer SET SCHEMA sales;

IMPORT TABLE specialofferproduct (
      specialofferid INT8 NOT NULL,
      productid INT8 NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      CONSTRAINT "primary" PRIMARY KEY (specialofferid ASC, productid ASC)
  ) CSV DATA ("userfile://defaultdb.public.userfiles_aw_admin/specialofferproduct.csv");
ALTER TABLE specialofferproduct SET SCHEMA sales;

CREATE TABLE sales.shoppingcartitem (
      shoppingcartid INT8 NOT NULL,
      shoppingcartitemid INT8 NOT NULL DEFAULT unique_rowid(),
      quantity INT8 NOT NULL DEFAULT 1:::INT8,
      productid INT8 NOT NULL,
      unitprice DECIMAL(7,2) NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      CONSTRAINT "primary" PRIMARY KEY (shoppingcartid ASC, shoppingcartitemid ASC),
      FAMILY "primary" (shoppingcartid, shoppingcartitemid, quantity, productid, unitprice, modifieddate),
      CONSTRAINT "CK_ShoppingCartItem_Quantity" CHECK (quantity >= 1:::INT8)
  );
INSERT INTO sales.shoppingcartitem values (626475451085367057,683895096480474897,1,712,8.99,'2021-08-12 14:30:20'),
  						(626475451085367057,683954039363020561,1,716,49.99,'2021-08-12 19:30:08'),
  						(626475451085367057,683954302335592209,1,969,2384.07,'2021-08-12 19:31:28'),
  						(626475451085367057,683954461303088913,1,760,782.99,'2021-08-12 19:32:16');

```

Once the import is completed, you can view the imported tables and select a handful of rows from a selection of tables to verify that the data was successfully imported.
There should be a total of 10 tables in the adventurework database - 7 in the production schema and 3 in the sales schema. We will set our search_path session setting to include all schemas so that we don't need to specify the schema name with every SQL statement.
The final example query below is an example of a join between one table in the sales schema and another table in the production schema. The prototype application needs to peform something similar to render the Show Basket page. 


```sql
SHOW TABLES;
   
     schema_name |              table_name               | type  |  owner   | estimated_row_count | locality
--------------+---------------------------------------+-------+----------+---------------------+-----------
  production  | product                               | table | aw_admin |                 504 | NULL
  production  | productdescription                    | table | aw_admin |                 254 | NULL
  production  | productmodelproductdescriptionculture | table | aw_admin |                 254 | NULL
  production  | productphoto                          | table | aw_admin |                  28 | NULL
  production  | productproductphoto                   | table | aw_admin |                 161 | NULL
  production  | productreview                         | table | aw_admin |                   4 | NULL
  production  | productsubcategory                    | table | aw_admin |                  38 | NULL
  sales       | shoppingcartitem                      | table | aw_admin |                   4 | NULL
  sales       | specialoffer                          | table | aw_admin |                  16 | NULL
  sales       | specialofferproduct                   | table | aw_admin |                  42 | NULL
(10 rows)
   
SET search_path=production,sales,public;
   
SELECT * FROM productsubcategory WHERE name = 'Gloves';
   
  productsubcategoryid | productcategoryid |  name  |    modifieddate
-----------------------+-------------------+--------+----------------------
                    20 |                 3 | Gloves | 2008-04-30 00:00:00
   
SELECT productnumber, name, size, color, listprice FROM product WHERE productsubcategoryid = 20;
   
  productnumber |         name          | size | color | listprice
----------------+-----------------------+------+-------+------------
  GL-H102-S     | Half-Finger Gloves, S | S    | Black |     24.49
  GL-H102-M     | Half-Finger Gloves, M | M    | Black |     24.49
  GL-H102-L     | Half-Finger Gloves, L | L    | Black |     24.49
  GL-F110-S     | Full-Finger Gloves, S | S    | Black |     37.99
  GL-F110-M     | Full-Finger Gloves, M | M    | Black |     37.99
  GL-F110-L     | Full-Finger Gloves, L | L    | Black |     37.99
(6 rows)
   
SELECT p.productnumber, p.name, s.quantity, s.unitprice FROM product p, shoppingcartitem s WHERE p.productid = s.productid; 
   
  productnumber |            name             | quantity | unitprice
----------------+-----------------------------+----------+------------
  CA-1098       | AWC Logo Cap                |        1 |      8.99
  LJ-0192-X     | Long-Sleeve Logo Jersey, XL |        1 |     49.99
  BK-R50R-60    | Road-650 Red, 60            |        1 |    782.99
  BK-T79U-60    | Touring-1000 Blue, 60       |        1 |   2384.07
(4 rows)
```

Congratulations! You have successfully loaded the adventureworks schema into your Cockroach Cloud cluster and performed some sample queries!


## Lab 3 - Setup a user for the web application

So far we have been logging in to CC using an administrative user. The admin role gives us permissions for creating databases, tables, users and granting privileges as well as CRUD operations (select, insert, update, delete) on any table in the cluster. This is exactly what we need for setting up the environment initially, but if we were to configure this user's name and password into our web application we would be increasing the probability of unauthorised administrative access.   

In this lab, we'll demonstrate how to set up a non-admin user and grant specific privileges to that user. We will do this using SQL as the Cockroach Cloud dashboard can only be used for creating admin users.

```sql
-- Create the application user
create user aw_web_fe with password notcha1nr3action;

-- Grant only the necessary privileges (mostly just select, but need to midify rows in the shoppingcartitem table)
grant connect on database adventureworks to aw_web_fe;
grant usage on schema adventureworks.production to aw_web_fe;
grant select on adventureworks.production.* to aw_web_fe;
grant usage on schema adventureworks.sales to aw_web_fe;
grant select on adventureworks.sales.* to aw_web_fe;
grant insert,update,delete on adventureworks.sales.shoppingcartitem to aw_web_fe;

Change the COCKROACH_URL environment variable to include the username/password "aw_web_fe:notcha1nr3action" instead of the aw_admin username and password. We can also include the  database name (adventureworks) as we've now finished with uploading csv files.  

```bash
# Linux / Mac
$ export COCKROACH_URL="postgresql://aw_web_fe:notcha1nr3action@<address>:26257/adventureworks?sslmode=require&options=--cluster=<cluster-name>"

# Windows Powershell
> $Env:COCKROACH_URL = "postgresql://aw_web_fe:notcha1nr3action@<address>:26257/adventureworks?sslmode=require&options=--cluster=<cluster-name>"

# verify that the new setting works
$ cockroach sql
   
adventureworks> select user;
   
  current_user
----------------
  aw_web_fe 

```

Let's repeat one of the queries that we ran earlier.
We must remember to set the search_path to include both production and sales schemas if we don't want to specify them every time. This is a session-level setting, so must be set every time we create a new connection to the cluster.


```sql
> SET search_path=production,sales;
SET

> SELECT p.productnumber, p.name, s.quantity, s.unitprice FROM product p, shoppingcartitem s WHERE p.productid = s.productid; 

  productnumber |            name             | quantity | unitprice
----------------+-----------------------------+----------+------------
  CA-1098       | AWC Logo Cap                |        1 |      8.99
  LJ-0192-X     | Long-Sleeve Logo Jersey, XL |        1 |     49.99
  BK-R50R-60    | Road-650 Red, 60            |        1 |    782.99
  BK-T79U-60    | Touring-1000 Blue, 60       |        1 |   2384.07
(4 rows)
```
We now are going to test the bounds of the aw_web_fe user by attempting the following actions that we expect to succeed:
* Selecting the most expensive items in the shoppingcartitem table (unit price over 700)
* Updating the quantity of the cheaper item from 1 to 2
* Deleting the most expensive item
* Inserting a brand new item
* Confirming the actions have been successful by re-executing the join query on products and shoppingcartitem 

And the following actions which we expect to fail (these are all actions that should require permissions of an admin user):
* Inserting a new photo for a product
* Deleting a product
* Changing the rating of a product review
* Dropping the product table
* Creating a new table in the production schema 
   
```sql   

> SELECT * FROM shoppingcartitem WHERE unitprice > 700.00;

    shoppingcartid   | shoppingcartitemid | quantity | productid | unitprice |    modifieddate
---------------------+--------------------+----------+-----------+-----------+----------------------
  626475451085367057 | 683954302335592209 |        1 |       969 |   2384.07 | 2021-08-12 19:31:28
  626475451085367057 | 683954461303088913 |        1 |       760 |    782.99 | 2021-08-12 19:32:16
(2 rows)

> UPDATE shoppingcartitem SET quantity = 2 WHERE shoppingcartitemid = 683954461303088913;
UPDATE 1

> DELETE FROM shoppingcartitem WHERE shoppingcartitemid = 683954302335592209;
DELETE 1

> INSERT INTO shoppingcartitem (shoppingcartid,productid,unitprice) VALUES (626475451085367057, 514, 133.34); 
INSERT 1

> SELECT p.productnumber, p.name, s.quantity, s.unitprice FROM product p, shoppingcartitem s WHERE p.productid = s.productid;
  productnumber |            name             | quantity | unitprice
----------------+-----------------------------+----------+------------
  SA-M198       | LL Mountain Seat Assembly   |        1 |    133.34
  CA-1098       | AWC Logo Cap                |        1 |      8.99
  LJ-0192-X     | Long-Sleeve Logo Jersey, XL |        1 |     49.99
  BK-R50R-60    | Road-650 Red, 60            |        2 |    782.99
(4 rows)

> \d productphoto

   column_name   |  data_type  | is_nullable |  column_default   | generation_expression |  indices  | is_hidden
-----------------+-------------+-------------+-------------------+-----------------------+-----------+------------
  productphotoid | INT8        |    false    | unique_rowid()    |                       | {primary} |   false
  modifieddate   | TIMESTAMP   |    false    | now():::TIMESTAMP |                       | {}        |   false
  image_name     | VARCHAR(96) |    true     | NULL              |                       | {}        |   false
(3 rows)

> INSERT INTO productphoto (image_name) VALUES ('new_image.gif');
ERROR: user aw_web_fe does not have INSERT privilege on relation productphoto
SQLSTATE: 42501

> DELETE FROM product WHERE productnumber = 'BK-T79U-60';
ERROR: user aw_web_fe does not have DELETE privilege on relation product
SQLSTATE: 42501

> SELECT productreviewid,productid,rating FROM productreview;
  productreviewid | productid | rating
------------------+-----------+---------
                1 |       709 |      5
                2 |       937 |      4
                3 |       937 |      2
                4 |       798 |      5
(4 rows)

> UPDATE productreview SET rating=5 WHERE productid = 937;
ERROR: user aw_web_fe does not have UPDATE privilege on relation productreview
SQLSTATE: 42501

> DROP TABLE product;
ERROR: user aw_web_fe does not have DROP privilege on relation product
SQLSTATE: 42501
   
> CREATE TABLE products_copy AS SELECT * from products;
ERROR: user aw_web_fe does not have CREATE privilege on schema production
SQLSTATE: 42501
```

We have successfully created a user for the application front end and given it a limited set of access permissions.
It can select from all of the tables in the sales and production schemas and can modify the contents of sales.shoppingcartitem, but nothing beyond this.

The web application currently lacks the functionality to create new rows in productreview - as an exercise can you work out how to enable the user to do this?
Note that unlike many other database technologies, CockroachDB users pick up granted privileges immediately - you do not have to log out and in again to pick up the privs!
Try it out - have one window logged in to CC as your admin user and another as the appliation user. Grants will take effect without having to reconnect.


## Lab 5 - Build the application docker image and run as a container

Update posgres_fns.py to set the correct URL for the pg_connect() function - remember to use the applicaton username and password - not the admin one!

Build a docker image and run the image exposing port 80 ...

```bash
> docker build -t adventureworks:1.0 .

> docker run -p 80:80 --name adventureworks -d adventureworks:1.0
```

Connect to a browser with the url - http://localhost/cgi-bin/AW_home.py


Congratulations! You have just successfully deployed a prototype website using Cockroach Cloud Free Tier as the database backend.
