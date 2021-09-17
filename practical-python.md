# Practical Python

## Overview

In this module we will connect to your CC Free Tier cluster and perform some basic operations in Python.

Pretty much everything in here can be run on any installation of Python - on the command line or using an IDE - but for the best experience you will need Jupyter Notebooks which can easily be installed on top of Python

## Labs Prerequisites

1. Connection URL to the Cockroach Cloud Free Tier

2. You also need:

    - a modern web browser
    - Python3 (installed on your machine or on a server you can easily access)
    - The ability to install Python packages with pip
    - [Cockroach SQL client](https://www.cockroachlabs.com/docs/stable/install-cockroachdb-linux)

3. Optional (but advised):

    - Jupyter Notebooks

## Installing Jupyter Notebooks



## Lab 1 - Setting up your CC Free Tier cluster

If you haven't done so already, setup your CC Free Tier cluster as described in the Getting Started module

We will be setting the COCKROACH_URL environment variable so that we don't have to use the --url option with every command.

Replace <password>, <address> and <cluster-name> with the details for your setup.

```bash
# Linux / Mac
> export COCKROACH_URL="postgresql://aw_admin:<password>@<address>:26257?sslmode=require&options=--cluster=<cluster-name>"

# Windows Powershell
> $Env:COCKROACH_URL = "postgresql://aw_admin:<password>@<address>:26257?sslmode=require&options=--cluster=<cluster-name>"
```



## Lab 2 - Connect to the cluster and create a table
