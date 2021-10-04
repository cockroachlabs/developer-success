# Practical Python

## Overview

In this module we will connect to your CC Free Tier cluster and perform some basic operations in Python.

Pretty much everything in here can be run on any installation of Python - on the command line or using an IDE - but for the best experience you will need Jupyter Notebooks which can easily be installed on top of Python

## Labs Prerequisites

1. Connection URL to the Cockroach Cloud Free Tier with admin username/password.

2. You also need:

    - a modern web browser
    - Python3 (installed on your machine or on a server you can easily access)
    - The ability to install Python packages with pip
    - [Cockroach SQL client](https://www.cockroachlabs.com/docs/stable/install-cockroachdb-linux)

3. Optional (but strongly advised):

    - Jupyter Notebooks

## Installing and Running Jupyter Notebooks

Install the jupyter package using pip:
```
pip install jupyter
```

Create a directory for Jupiter Notebook files to live:

```
mkdir jupyter
```

Navigate into to your Jupyter directory and start Notebook:

```
cd jupyter
jupyter notebook
```

If you are running this on your local machine, a browser window will be opened and you will be automatically logged in. 
If you are running Jupyter Notebooks on a remote server, follow the instructions on this page: [Running a notebook server](https://jupyter-notebook.readthedocs.io/en/stable/public_server.html)

## Lab 1 - Practical Python Main Notebook

Download Practical-Python-v1.ipynb and TP2019.csv from [here](https://github.com/cockroachlabs/developer-success/tree/main/data/practical-python) into your Jupyter Notebooks directory.

Launch the notebook by refreshing the Jupyter dashboard and clicking on Practical-Python-v1 - new window will open with the selected notebook. 

The notebook contains all further instructions. 


## Lab 2 - Cockroach Bank App Notebook

Download Cockroach-Bank-App-v1.ipynb from [here](https://github.com/cockroachlabs/developer-success/tree/main/data/practical-python) into your Jupyter Notebooks directory.

Launch the notebook by refreshing the Jupyter dashboard and clicking on Practical-Python-v1 - a new window will open with the selected notebook. 

The notebook contains all further instructions. 
