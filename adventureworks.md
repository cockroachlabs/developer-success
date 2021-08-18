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


grant insert,update,delete on adventureworks.sales.shoppingcartitem to aw_web_fe;

## Lab 2 - Create and Import the Adventureworks Schema

In this lab, we will create a database  import data from comma-separated value (CSV) files. To accomplish this, you will import two existing CSV files that has been provided for this workshop. The `employee.csv` file contains records for 100 employees, including their employee number, birth date, first name, last name, gender and hire date. The `rooms.csv` file contains records for conference rooms, including the room number, name and capacity.

First, download the `employees.csv` and `rooms.csv` files from the `data/import-backup-restore` directory.

Next, upload the CSV files to your Cockroach Cloud cluster as `userfiles`.

> The following commands assume that you have defined the COCKROACH_URL environment variable as we did in the previous Lab

```bash
# upload data files to cluster
$ cockroach userfile upload productsubcategory.csv 
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

Next, switch to the `adventureworks` database and run the first `IMPORT TABLE` commands. 
Remember to successfully import data from the CSV files, the table schema must be defined to match the number and order of columns in the CSV file.
Alternatively you can pre-create the table using `CREATE TABLE` and import the csv files using the `IMPORT INTO` command.

Make sure to replace `XXX` with the username that you are using to connect to your cluster.

```sql
> USE adventureworks;
> create schema production;
> create schema sales;

> IMPORT TABLE productsubcategory (
      productsubcategoryid INT8 NOT NULL DEFAULT unique_rowid() PRIMARY KEY,
      productcategoryid INT8 NOT NULL,
      name VARCHAR(50) NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP
  ) CSV DATA ("userfile://defaultdb.public.userfiles_XXX/productsubcategory.csv");
> ALTER TABLE productsubcategory SET SCHEMA production;

> IMPORT TABLE product (
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
  ) CSV DATA ("userfile://defaultdb.public.userfiles_XXX/product.csv") WITH delimiter = '|';
> ALTER TABLE product SET SCHEMA production;
> UPDATE production.product SET weight=null WHERE weight=0.0;
> UPDATE production.product SET color=null WHERE color='';
> UPDATE production.product SET size=null WHERE size='';

> IMPORT TABLE productphoto (
      productphotoid INT8 NOT NULL DEFAULT unique_rowid() PRIMARY KEY,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      image_name VARCHAR(96) NULL
  ) CSV DATA ("userfile://defaultdb.public.userfiles_XXX/productphoto.csv");
> ALTER TABLE productphoto SET SCHEMA production;

> IMPORT TABLE productproductphoto (
      productid INT8 NOT NULL,
      productphotoid INT8 NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      CONSTRAINT "primary" PRIMARY KEY (productid ASC, productphotoid ASC)
  ) CSV DATA ("userfile://defaultdb.public.userfiles_XXX/productproductphoto.csv");
> ALTER TABLE productproductphoto SET SCHEMA production;

> IMPORT TABLE productreview (
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
  ) CSV DATA ("userfile://defaultdb.public.userfiles_XXX/productreview.csv") WITH delimiter = '|';
> ALTER TABLE productreview SET SCHEMA production;

> IMPORT TABLE productmodelproductdescriptionculture (
      productmodelid INT8 NOT NULL,
      productdescriptionid INT8 NOT NULL,
      cultureid CHAR(6) NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      CONSTRAINT "primary" PRIMARY KEY (productmodelid ASC, cultureid ASC),
      INDEX productmodelproductdescriptionculture_productdescription (productdescriptionid ASC)
  ) CSV DATA ("userfile://defaultdb.public.userfiles_XXX/pmpdc.csv");
> ALTER TABLE productmodelproductdescriptionculture SET SCHEMA production;

> IMPORT TABLE productdescription (
      productdescriptionid INT8 NOT NULL,
      description VARCHAR(400) NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      CONSTRAINT "primary" PRIMARY KEY (productdescriptionid ASC)
  ) CSV DATA ("userfile://defaultdb.public.userfiles_XXX/productdescription.csv") WITH delimiter = '|';
> ALTER TABLE productdescription SET SCHEMA production;

> IMPORT TABLE specialoffer (
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
  ) CSV DATA ("userfile://defaultdb.public.userfiles_XXX/specialoffer.csv");
> ALTER TABLE specialoffer SET SCHEMA sales;

> IMPORT TABLE specialofferproduct (
      specialofferid INT8 NOT NULL,
      productid INT8 NOT NULL,
      modifieddate TIMESTAMP NOT NULL DEFAULT now():::TIMESTAMP,
      CONSTRAINT "primary" PRIMARY KEY (specialofferid ASC, productid ASC)
  ) CSV DATA ("userfile://defaultdb.public.userfiles_XXX/specialofferproduct.csv");
> ALTER TABLE specialofferproduct SET SCHEMA sales;

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
> INSERT INTO sales.shoppingcartitem values (626475451085367057,683895096480474897,1,712,8.99,'2021-08-12 14:30:20'),
  						(626475451085367057,683954039363020561,1,716,49.99,'2021-08-12 19:30:08'),
  						(626475451085367057,683954302335592209,1,969,2384.07,'2021-08-12 19:31:28'),
  						(626475451085367057,683954461303088913,1,760,782.99,'2021-08-12 19:32:16');

```

Once the import is completed, you can view the imported table and select a handful of rows from the table to verify that the data was successfully imported.

```sql
> SHOW TABLES;
> SET search_path=production,sales,public;
> SELECT * FROM productsubcategory WHERE name = 'Gloves';
> SELECT productnumber, name, size, color, listprice FROM product WHERE productsubcategoryid = 20;
> SELECT p.productnumber, p.name, s.quantity, s.unitprice FROM product p, shoppingcartitem s WHERE p.productid = s.productid; 	
```

Congratulations! You have successfully loaded the adventureworks schema into your Cockroach Cloud cluster!


## Lab 3 - Setup a user for the web application

So far we have been logging in to CC using an administrative user. The admin role gives us permissions for creating databases, tables, users and granting privileges as well as CRUD operations (select, insert, update, delete) on any table in the cluster. This is exactly what we need for setting up the environment initially, but if we were to configure this user's name and password into our web application we would be increasing the probability of unauthorised administrative access.   

In this lab, we'll demonstrate how to set up a non-admin user and grant specific privileges to that user.



```sql
-- Create the application user
defaultdb> create user aw_web_fe with password notcha1nr3action;

CREATE DATABASE

-- Grant only the necessary privileges (mostly just select, but need to midify rows in the shoppingcartitem table)
> grant connect on database adventureworks to aw_web_fe;
> grant usage on schema adventureworks.production to aw_web_fe;
> grant select on adventureworks.production.* to aw_web_fe;
> grant usage on schema adventureworks.sales to aw_web_fe;
> grant select on adventureworks.sales.* to aw_web_fe;
> grant insert,update,delete on adventureworks.sales.shoppingcartitem to aw_web_fe;

Change the COCKROACH_URL environment variable to include the username/password "aw_web_fe:notcha1nr3action" instead of the admin username and password  

```bash
# verify that the new setting works
$ cockroach sql -d adventureworks
```

Let's repeat one of the queries that we ran earlier.
Remember to set the search_path to include both production and sales schemas.

```sql
> SELECT user;

  current_user
----------------
  aw_web_fe

> SHOW TABLES;

  schema_name |              table_name               | type  |  owner   | estimated_row_count | locality
--------------+---------------------------------------+-------+----------+---------------------+-----------
  production  | product                               | table | alistair |                 504 | NULL
  production  | productdescription                    | table | alistair |                 254 | NULL
  production  | productmodelproductdescriptionculture | table | alistair |                 254 | NULL
  production  | productphoto                          | table | alistair |                  28 | NULL
  production  | productproductphoto                   | table | alistair |                 161 | NULL
  production  | productreview                         | table | alistair |                   4 | NULL
  production  | productsubcategory                    | table | alistair |                  38 | NULL
  sales       | shoppingcartitem                      | table | alistair |                   0 | NULL
  sales       | specialoffer                          | table | alistair |                  16 | NULL
  sales       | specialofferproduct                   | table | alistair |                  42 | NULL
(10 rows)

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

```

We have successfully created a user for the application front end and given it a limited set of access permissions.
It can select from all of the tables in the sales and production schemas and can modify the contents of sales.shoppingcartitem, but nothing beyond this.

The web application currently lacks the functionality to create new rows in productreview - as an exercise can you work out how to enable the user to do this?
Note that unlike many other database technologies, CockroachDB users pick up granted privileges immediately - you do not have to log out and in again to pick up the privs!
Try it out - have one window logged in to CC as your admin user and another as the appliation user. Grants will take effect without having to reconnect.


## Lab 5 - Build the application docker image and run as a container

Update posgres_fns.py to set the correct URL for the pg_connect() function - remember to use the applicaton username and password - not the admin one!

Build a docker image called adventureworks:1.0

> docker build -t adventureworks:1.0 .

Now run the image exposing port 80

> docker run -p 80:80 --name adventureworks -d adventureworks:1.0

Connect to a browser with the url - http://localhost/cgi-bin/AW_home.py


Congratulations! You have just successfully deployed a prototype website using Cockroach Cloud Free Tier as the database backend.
