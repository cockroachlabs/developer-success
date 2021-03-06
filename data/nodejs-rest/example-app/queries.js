const fs = require('fs')
const dotenv = require('dotenv')
dotenv.config()
const Pool = require('pg').Pool

const ca_cert = process.env.SSL_CERT_CONTENTS ? process.env.SSL_CERT_CONTENTS : fs.readFileSync(process.env.SSL_CERT)

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_DBNAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    "ca": ca_cert
    },
})
//create a customer
//raft write
const createCustomer = (req, res)  => {
    const {first_name, last_name, email} = req.body
    //use RETURNING to return uuid generated by CRDB
    pool.query('INSERT INTO customer (first_name, last_name, email) VALUES ($1, $2, $3) \
        RETURNING customer_id;',
     [first_name, last_name, email], (error, results) => {
        if (error) {
            res.status(404).send('The customer with the given ID was not found.')
            throw error
        }
        res.status(200).json(results.rows[0])
    })
}
//get customer by id
//leaseholder 
const getCustomerById = (req, res) => {
    const id = req.params.id
    pool.query('SELECT * FROM customer WHERE customer_id = $1;',
        [id], (error, results) => {
        if (error) {
            res.status(404).send('The customer with the given ID was not found.')
            throw error
        }
        res.status(200).json(results.rows)
    })
}
//update customer by id
const updateCustomer = (req, res)  => {
    const id = req.params.id
    const {first_name, last_name, email} = req.body
    pool.query('UPDATE customer SET first_name = $2, last_name = $3, email = $4 \
        WHERE customer_id = $1 RETURNING *;', 
            [id, first_name, last_name, email], (error, results) => {
        if (error) {
            console.log(error.stack)
            res.status(404).send('The customer with the given ID was not found.')
            throw error
        }
        res.status(200).json(results.rows[0])
    })
}
//delete a customer by id
const deleteCustomer = (req, res)  => {
    const id = req.params.id
    pool.query('DELETE FROM customer WHERE customer_id = $1 RETURNING customer_id', 
            [id], (error, results) => {
        if (error) {
            console.log(error.stack)
            res.status(404).send('The customer with the given ID was not found.')
            throw error
          }
        res.status(200).send(id)
    })
}
//get all customers

const getCustomers = (req, res) => {
    const limit = req.query.limit
    const offset = req.query.offset
    pool.query('SELECT * FROM customer ORDER BY last_update DESC LIMIT $1 OFFSET $2', 
        [limit, offset], (error, results) => {
        if (error) {
            throw error
        }
        res.status(200).json(results.rows)
    })
}
//
module.exports = {
    createCustomer,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    getCustomers
  }
