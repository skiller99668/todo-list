const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');

const port = 3000;

app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let tasks = [
  { id: 1, title: 'Task 1', done: false },
  { id: 2, title: 'Task 2', done: true },
  { id: 3, title: 'Task 3', done: false }
];



app.get('/', (req, res) => {
  res.json({"name": "Task API", "version": "1.0", "endpoint": ["/tasks"]});
});

app.get('/health', (req, res) => {
  res.json({"status": "ok"});
});

app.get('/tasks', async (req, res) => {
    const result = await pool.query('SELECT * FROM tasks');
    res.json(result.rows);
});

app.get('/tasks/:id', async (req, res) => {
    const taskId = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (result.rows.length > 0) {
        res.json(result.rows[0]);
    } 
    else {
        res.status(404).json({ error: `Task ${taskId} not found` });
    }
});

app.post('/tasks', async (req, res) => {
    if (!req.body.title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *', [req.body.title, req.body.done ?? false]);
    res.status(201).json(result.rows[0]);
});

app.put('/tasks/:id', async (req, res) => {
    const taskId = parseInt(req.params.id);

    if (!req.body) {
        return res.status(400).json({ error: 'Empty request body' });
    }
    const existingTaskResult = await pool.query('SELECT * FROM tasks WHERE id =$1', [taskId]);
    if (existingTaskResult.rows.length === 0) {
        return res.status(404).json({ error: `Task ${taskId} not found` });
    }
    const task = existingTaskResult.rows[0];

    const result = await pool.query('UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *', [req.body.title ?? task.title, req.body.done ?? task.done, taskId]);

    res.json(result.rows[0]);
});

app.delete('/tasks/:id', async (req, res) => {
    const taskId = parseInt(req.params.id);

    const existingTaskResult = await pool.query('SELECT * FROM tasks WHERE id =$1', [taskId]);
    if (existingTaskResult.rows.length === 0) {
        return res.status(404).json({ error: `Task ${taskId} not found` });
    }

    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    res.status(204).send();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong.' });
});