const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
require('dotenv').config();

const port = 3000;

app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);




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

// Authentifcation System with supabase:
// ===================================================

// middleware

async function verifyToken(req, res, next)
{
    const auth_header = req.headers.authorization

    if (!auth_header || !auth_header.startsWith('Bearer '))
    {
        return res.status(401).json({error: 'Access token required'})
    }
    
    const token = auth_header.split(' ')[1];
    if (!token)
    {
        return res.status(401).json({error: 'Access token required'})
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error)
    {
        return res.status(401).json({ error: 'Invalid or expired token'})
    }

    req.user = data.user;
    next();
}

app.post('/auth/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and/or password are required' });
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(201).json({message: 'Created', user: data.user});
});


app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and/or password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        return res.status(401).json({ error: 'Invalid login credentials' });
    }
    return res.status(200).json({ 
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
     });
});


app.get('/public/info', (req, res) => {
    return res.status(200).json({ message: "Welcome stranger! This info is public."})
});

app.get('/protected/profile', verifyToken, (req, res) => {
    return res.status(200).json({id: req.user.id, email: req.user.email, created_at: req.user.created_at})
});

app.get('/protected/dashboard', verifyToken, (req, res) =>{
    res.json({ message: 'Welcome to your dashboard'})
});

app.post('/auth/logout', verifyToken, async (req, res) => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        return res.status(401).json({ error: error.message})
    }

    return res.status(204).send();
});
// ===================================================

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

