# Query Optimization

## Overview

Query optimization is an essential part of database development.

In these labs, you will learn how to use

- SHOW STATISTICS
- ANALYZE
- EXPLAIN
- EXPLAIN ANALYZE
- CREATE INDEX

## Labs Prerequisites

1. Connection URL to the CockroachDB Cloud Free Tier

2. You also need:

    - a modern web browser,
    - [Cockroach SQL client](https://www.cockroachlabs.com/docs/stable/install-cockroachdb-linux)

## Lab 1 - Setup TPCC using Cockroach SQL Client

Use the `cockroach workload` command to initialize your database with TPCC data.

Format:

```bash
$ cockroach workload init tpcc --drop --db tpcc --warehouses 5 JDBC_URL
```

For "JDBC_URL" specify the JDBC URL that the CockroachDB Cloud Free Tier signup page showed you when you created your cluster.

For example:

```bash
cockroach workload init tpcc --drop --db tpcc --warehouses 5 "postgresql://USER:$PASSWORD@free-tier.gcp-us-central1.cockroachlabs.cloud:26257/tpcc?sslmode=verify-full&sslrootcert=$HOME/.postgresql/root.crt&options=--cluster%3CLUSTER_NAME"
I210923 21:33:56.771027 1 workload/workloadsql/dataload.go:146  [-] 1  imported warehouse (0s, 5 rows)
I210923 21:34:01.556860 1 workload/workloadsql/dataload.go:146  [-] 2  imported district (5s, 50 rows)
I210923 21:35:32.895433 1 workload/workloadsql/dataload.go:146  [-] 3  imported customer (1m31s, 150000 rows)
I210923 21:36:15.181264 1 workload/workloadsql/dataload.go:146  [-] 4  imported history (42s, 150000 rows)
I210923 21:36:50.932314 1 workload/workloadsql/dataload.go:146  [-] 5  imported order (36s, 150000 rows)
I210923 21:37:00.073003 1 workload/workloadsql/dataload.go:146  [-] 6  imported new_order (9s, 45000 rows)
I210923 21:37:21.608130 1 workload/workloadsql/dataload.go:146  [-] 7  imported item (22s, 100000 rows)
I210923 21:40:33.536421 1 workload/workloadsql/dataload.go:146  [-] 8  imported stock (3m12s, 500000 rows)
I210923 21:46:54.336262 1 workload/workloadsql/dataload.go:146  [-] 9  imported order_line (6m21s, 1500459 rows)
```

## Lab 2 - Database Statistics

Connect to your CockroachDB instance using a database client.  Issue the following queries one at a time, and observe the results.

```sql
-- Create a database to play in
CREATE DATABASE test;

-- Switch to the database we just created
USE test;

-- Create a test table
CREATE TABLE users (
    pk UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    height FLOAT);

-- Show the table definition
SHOW CREATE TABLE users;

-- Give the table 3 rows of data
INSERT INTO users (name, height) VALUES ('Joe', 5.6), ('Karen', 5.7), ('Sue', 5.5);

-- Look at the test data
SELECT * FROM users;

-- Look at the statistics for the table
SHOW STATISTICS FOR TABLE users;

-- Collect database statistics on the table
ANALYZE users;

-- Look atagin at the statistics for the table
SHOW STATISTICS FOR TABLE users;
```

## Lab 3 - Query plans and EXPLAIN

Continue using your connection to your CockroachDB instance using a database client.
Issue the following queries one at a time, and observe the results.

```sql
-- Switch to the TPCC database that you set up prviously using cockroach workload
USE tpcc;

-- basic full scan OK
explain select c_balance from customer;

-- show limited scan
explain select c_balance from customer limit 10;

-- show bad full scan
explain select c_zip from customer where c_city='Austin';

-- show good index but bad index join
explain select c_zip from customer where c_w_id=0 and c_d_id=1 and c_last='BARBARBAR';

-- look at the indexes
show indexes from customer;

-- look at the table definition
show create table customer;

-- more complex plan - simple
EXPLAIN SELECT ol_number, SUM(ol_quantity) 
     FROM order_line 
     WHERE ol_amount > 8000 
     GROUP BY ol_number 
     ORDER BY ol_number;

-- more complex plan - verbose
EXPLAIN (VERBOSE) SELECT ol_number, SUM(ol_quantity) 
     FROM order_line 
     WHERE ol_amount > 8000 
     GROUP BY ol_number 
     ORDER BY ol_number;

-- even more complex plan - opt, verbose
EXPLAIN (OPT, VERBOSE) SELECT ol_number, SUM(ol_quantity) 
     FROM order_line 
     WHERE ol_amount > 8000 
     GROUP BY ol_number 
     ORDER BY ol_number;

-- introducing EXPLAIN (ANALYZE) - no analyze
EXPLAIN SELECT * FROM warehouse;

-- now compare EXPLAIN (ANALYZE)
EXPLAIN ANALYZE SELECT * FROM warehouse;

-- show filter and sort in EXPLAIN (ANALYZE)
EXPLAIN ANALYZE select * from item where i_price > 100 order by i_price desc;

-- show group by aggregate in EXPLAIN (ANALYZE)
EXPLAIN ANALYZE SELECT ol_number, SUM(ol_quantity) FROM order_line
     WHERE ol_amount > 8000 GROUP BY ol_number ORDER BY ol_number;

-- EXPLAIN ANALYZE (DEBUG) to get a Zip file with detailed info
EXPLAIN ANALYZE (DEBUG)
SELECT ol_number, SUM(ol_quantity)
FROM order_line
WHERE ol_amount > 8000
GROUP BY ol_number
ORDER BY ol_number;
```

## Lab 4 - Indexes and Covering Indexes, and Partial Indexes

Continue using your connection to your CockroachDB instance using a database client.
Issue the following queries one at a time, and observe the results.

```sql
-- no index
explain analyze select ol_amount, ol_quantity from order_line where ol_supply_w_id=100;

-- add non-covering index
-- about 70 sec
-- DELETE TO RE-RUN
-- drop index idx1;
create index idx1 on order_line (ol_supply_w_id);

-- see plan with non-covering index: better but not best
explain analyze select ol_amount, ol_quantity from order_line where ol_supply_w_id=100;

-- add covering index
-- about 30-75 sec
-- DELETE TO RE-RUN
-- drop index idx2;
create index idx2 on order_line ( ol_supply_w_id ) storing (ol_quantity, ol_amount);

-- show with covering index
explain analyze select ol_amount, ol_quantity from order_line where ol_supply_w_id=100;


---- partial indexes ----

-- how many order lines?
select count(*) from order_line;

-- how many order lines over $9000 ?
select count(*) from order_line where ol_amount > 9000;

-- what does ol_dist_info look like?
select ol_dist_info from order_line limit 15;

-- pre-index explain how many order lines over $9000 have ol_dist_info that starts with 'a' ?
explain analyze select count(*) 
from order_line
where ol_amount > 9000 and left(ol_dist_info, 1) = 'a';

-- create the partial index
-- about 25 sec
-- DELETE TO RE-RUN
-- drop index idx_dist_info_partial;
CREATE INDEX idx_dist_info_partial
   ON order_line(ol_dist_info)
   WHERE ol_amount > 9000;

-- faster!
-- post-index explain how many order lines over $9000 have ol_dist_info that starts with 'a' ?
explain analyze select count(*) 
from order_line
where ol_amount > 9000 and left(ol_dist_info, 1) = 'a';
```
