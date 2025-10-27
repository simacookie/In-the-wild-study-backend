const express = require('express')
const mysql = require('mysql2')
const app = express()
const port = 3000

app.use(express.json())

// Simple MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',        // change to your MySQL username
  password: '',        // change to your MySQL password
  database: 'in_the_wild_study'   // change to your database name
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Add this middleware to parse JSON requests

// POST endpoint to create a new VR nugget result
app.post('/vr-nugget-results', (req, res) => {
  const { user_id, duration_in_seconds, number_of_errors, number_of_helps } = req.body
  
  // Validate required fields
  if (user_id === undefined|| duration_in_seconds === undefined || number_of_errors === undefined || number_of_helps === undefined) {
    return res.status(400).json({ 
      error: 'Missing required fields. Please provide: user_id, duration_in_seconds, number_of_errors, number_of_helps' 
    })
  }
  
  const query = 'INSERT INTO vr_nugget_results (user_id, duration_in_seconds, number_of_errors, number_of_helps) VALUES (?, ?, ?, ?)'
  
  connection.query(query, [user_id, duration_in_seconds , number_of_errors, number_of_helps], (err, results) => {
    if (err) {
      console.error('Database error:', err)
      return res.status(500).json({ error: 'Failed to insert data' })
    }
    
    res.status(201).json({ 
      message: 'VR nugget result created successfully',
    })
  })
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})