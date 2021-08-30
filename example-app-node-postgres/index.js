//dependencies
const db = require('./queries')
const express = require('express')
const { request } = require('http')
const { countReset } = require('console')
const dotenv = require('dotenv')
dotenv.config()
const app = express()
app.use(express.json())
// PORT
const port = process.env.PORT || 3000

app.get('/', (req, res) => {
    res.send('This is an Node.js REST API example using pg')
})

app.get('/api/customers', db.getCustomers)
app.get('/api/customers/:id', db.getCustomerById)
app.post('/api/customers', db.createCustomer)
app.put('/api/customers/:id', db.updateCustomer)
app.delete('/api/customers/:id', db.deleteCustomer)
app.listen(port, () => console.log('Listening on port ${PORT}'))

