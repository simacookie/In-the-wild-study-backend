const express = require('express')
const mysql = require('mysql2')
const fs = require('fs')
const path = require('path')
const app = express()
const port = 3000
const levenshtein = require('damerau-levenshtein');

// Middleware to parse JSON
app.use(express.json())

// ---- Load knowledge test config at server start ----
let knowledgeTestConfig = null;
let correctObjects = [];
let correctVerbs = [];

function loadKnowledgeTestConfig() {
  const configPath = path.join(__dirname, 'knowledge-test-config.json');
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    knowledgeTestConfig = JSON.parse(data);
    initCorrectObjectsAndVerbsArrays();
    console.log('Knowledge test config loaded at startup.');
  } catch (err) {
    console.error('Failed to load knowledge test config at startup:', err);
  }
}

function initCorrectObjectsAndVerbsArrays() {
    const correct_answer = knowledgeTestConfig.correctAnswer;
    // Get every characters at even indices from correct_answer
    correctObjects = [];
    for (let i = 0; i < correct_answer.length; i += 2) {
      correctObjects.push(correct_answer[i]);
    }
    // Get every characters at odd indices from correct_answer
    correctVerbs = [];
    for (let i = 1; i < correct_answer.length; i += 2) {
      correctVerbs.push(correct_answer[i]);
    }
}

// Call this once at server start
loadKnowledgeTestConfig();

// Simple MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',        // change to your MySQL username
  password: '',        // change to your MySQL password
  database: 'in_the_wild_study'   // change to your database name
})


// GET endpoint to retrieve knowledge test configuration (objects and verbs)
app.get('/knowledge-test-config', (req, res) => {
  res.json(knowledgeTestConfig.cardpool)
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

// POST endpoint to submit knowledge test answer result
app.post('/knowledge-test-answer', (req, res) => {
  const result = req.body.answer;
  const user_id = req.body.user_id;
  const correct_answer = knowledgeTestConfig.correctAnswer;
  // Validate required field
  if (result === undefined) {
    return res.status(400).json({ 
      error: 'Missing required field. Please provide: result' 
    });
  }
  
  // For now, just read the result string (log it)

  const levenshteinDamerauDistance = levenshtein(result, correct_answer).steps;

  const answeredObjects = [];
  const answeredVerbs = [];
  for (let i = 0; i < result.length; i += 2) {
    answeredObjects.push(result[i]);
  }
  for (let i = 1; i < result.length; i += 2) {
    answeredVerbs.push(result[i]);
  }

  let intersectionAnsweredObjectsAndCorrectObjects = [...new Set(answeredObjects.filter(object => correctObjects.includes(object)))];
  let intersectionAnsweredVerbsAndCorrectVerbs = [...new Set(answeredVerbs.filter(verb => correctVerbs.includes(verb)))];

  let unionAnsweredObjectsAndCorrectObjects = [...new Set([...answeredObjects, ...correctObjects])];
  let unionAnsweredVerbsAndCorrectVerbs = [...new Set([...answeredVerbs, ...correctVerbs])];

  let jaccardSimilarityofObjects = intersectionAnsweredObjectsAndCorrectObjects.length / unionAnsweredObjectsAndCorrectObjects.length;
  let jaccardSimilarityOfVerbs = intersectionAnsweredVerbsAndCorrectVerbs.length / unionAnsweredVerbsAndCorrectVerbs.length;

  let totalError = levenshteinDamerauDistance / (0.5 * (jaccardSimilarityofObjects + jaccardSimilarityOfVerbs));

  console.log('Total Error:', totalError)
  res.status(201).json({ 
    message: 'Knowledge test result received successfully',
    totalError: totalError,
    levenshteinDamerauDistance: levenshteinDamerauDistance,
    jaccardSimilarityofObjects: jaccardSimilarityofObjects,
    jaccardSimilarityOfVerbs: jaccardSimilarityOfVerbs
  })
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})