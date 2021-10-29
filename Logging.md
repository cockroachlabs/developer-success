# Accessing Logs in Cockroach Cloud

## Overview

CockroachDB [logs](https://www.cockroachlabs.com/docs/stable/logging-overview.html) include details about notable cluster, node, and range-level events.

Each log message is composed of a **payload** and an envelope that contains **event metadata** (e.g., severity, date, timestamp, channel).

Log messages are organized into appropriate **logging channels** and then routed through **log sinks**.

Each sink further **processes and filters** the messages before emitting them to destinations outside CockroachDB.

The mapping of channels to sinks, as well as the processing and filtering done by each sink, is defined in a [logging configuration](https://www.cockroachlabs.com/docs/stable/configure-logs.html) common to all Cockroach Cloud clusters. (See https://github.com/cockroachlabs/managed-service/blob/master/operators/cockroach-operator/manifests/internal/yaml/logging/configmap.yaml)

### Channels

Here is the list of all [channels](https://www.cockroachlabs.com/docs/v21.1/logging#logging-channels) defined in the CockroachDB logging system.

| Channel | Description |
|---------|-------------|
| DEV | Uncategorized and debug messages. |
| OPS | Process starts, stops, shutdowns, and crashes (if they can be logged); changes to cluster topology, such as node additions, removals, and decommissions.|
| HEALTH | Resource usage; node-node connection events, including connection errors; up- and down-replication and range unavailability.|
| STORAGE | Low-level storage logs |
| SESSIONS | Client connections and disconnections; SQL authentication logins/attempts and session/query terminations.|
| SQL_SCHEMA | Database, schema, table, sequence, view, and type creation; changes to table columns and sequence parameters.|
| USER_ADMIN | Changes to users, roles, and authentication credentials.|
| PRIVILEGES | Changes to privileges and object ownership.|
| SENSITIVE_ACCESS | SQL audit events.|
| SQL_EXEC | SQL statement executions and uncaught Go panic errors during SQL statement execution.|
| SQL_PERF | SQL executions that impact performance, such as slow queries.|

### Sinks

Channels output messages to sinks.  User-accessible log sinks in Cockroach Cloud clusters are filesets.  The standard Cockroach Cloud logging configuration defines the following filesets, containing the specified channels:

| Fileset Name | Contains Channels |
|---------|-------------|
| `cockroach` | `DEV`, `OPS`, `HEALTH`, `SQL_SCHEMA`, `USER_ADMIN`, `PRIVILEGES` |
| `cockroach-pebble` | `STORAGE` |
| `cockroach-sql-audit` | `SENSITIVE_ACCESS` |
| `cockroach-sql-auth` | `SESSIONS` |
| `cockroach-sql-exec` | `SQL_EXEC` |
| `cockroach-sql-slow` | `SQL_PERF` |

## Lab Exercise

### Setup

Create or get access to a Cockroach Cloud cluster

- See https://www.cockroachlabs.com/docs/cockroachcloud/create-your-cluster

Note that you **cannot** perform these exercises on a serverless (aka "free tier") cluster. 
- Logging in CockroachDB is handled at the node level, and serverless clusters do not own the nodes they run on.
- Serverless clusters present a DB Console that does not include the Advanced Debug page that we use to access logfiles.

### Make sure you can access log messages via the DB Console

1. Bring up the DB Console in a web browser.
2. Navigate to the **Advanced Debug** page and click the link labeled **Cluster Settings**.
3. Search for `server.remote_debugging.mode`. The value must be `any` to let the DB Console display log messages.  
5. If your value is either `off` or `local`, perform the rest of the steps in this section to enable remote debugging.
6. Establish a SQL connection to the cluster ... see https://www.cockroachlabs.com/docs/stable/connect-to-the-database-cockroachcloud
7. Issue the command `set cluster setting server.remote_debugging.mode='any';`
8. Verify the setting is changed, either with `show cluster setting server.remote_debugging.mode` or by looking at the **Cluster Settings** page in the DB Console.

### Look at the log messages for the node you're connected to

8. Return to your web browser and the DB Console.
1. Navigate to the **Advanced Debug** page
1. Under the heading **Raw Status Endpoints (JSON)**, click the link for **Logs On a Specific Node**
2. Note that the endpoint is `/_status/logs/local` and the message format is JSON
3. Scan through the log messages for this node, noting that there are messages from multiple channels that are configured for different sinks.

You're looking at the collected log messages for this node.

### Look at the log messages for the other nodes

13. Scan through the messages and see if you can identify which node you're connected to (i.e. which node is **local**).
7. If you can't tell from the log, look at the hostname in the URL and compare it to the node list for your cluster.
8. Change the specified node in the URL to each of the node numbers (1 .. N) of your N-node cluster, and scan the logs from the different nodes.

### Find out what log files reside on the local node, and look at one

16. On **Advanced Debug**, click the link for **Log Files**
2. Scan the file list, and identify all the files that belong to each fileset (`cockroach`, `cockroach-pebble`, `cockroach-stderr`, etc.). The fileset to which a file belongs is indicated by its **details.program** attribute (which is also its filename prefix)
3. Find the oldest file in the `cockroach-pebble` fileset, then highlight and copy its name (not including the quotation marks).
4. Back on **Advanced Debug**, click the link for **Specific Log File**
5. You should get a page that specifies the short filename `cockroach.log`, and an error message indicating that "symlinks are not allowed".  That's because the short file name is a symlink to the current file in the corresponding fileset (aka sink, aka program).
6. Replace "cockroach.log" in the URL with the filename you copied in step 3 above.
7. Now you should have a page showing the contents of that specific file.

### Look at other log files on the same node

23. Repeat the steps in the previous section with other filenames listed on the **Log Files** page.

### Repeat this for the other nodes

You've been operating on the local node, without necessarily knowing what node that is.  Let's imagine that you're diagnosing a problem on a specific node.

24. On **Advanced Debug**, click the link for **Log Files**
2. In the URL, replace **local** with **1** to see the log files for node 1 in particular.
3. Repeat for all the nodes in the cluster, changing the node id in the URL to 2..N
4. Note that the filesets on any 2 nodes may be very different; there may be more files in a given fileset on one node than the other, or some fileset(s) may be present on one but not on another.  It all depends on what messages were generated on each node, and when.

### Turn remote debugging off

28. Go back to your SQL connection from the first exercise.
29. Issue the command `set cluster setting server.remote_debugging.mode='off';`
30. Back on the **Advanced Debug**, click the link for **Specific Log File**.
33. You should get an error message `not allowed (due to the 'server.remote_debugging.mode' setting)`

## Reference

- [Logging Overview](https://www.cockroachlabs.com/docs/stable/logging-overview.html)
- [Managing Access to the Console](https://www.cockroachlabs.com/docs/cockroachcloud/console-access-management.html)
- [Overview of the DB Console](https://www.cockroachlabs.com/docs/stable/ui-overview.html)
- [Advanced Debug page](https://www.cockroachlabs.com/docs/stable/ui-debug-pages)
 


