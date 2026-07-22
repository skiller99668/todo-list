const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');

//const db = require('./db');

const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('tasks.db');

db.exec(`
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT 0
);
`);

const countResult = db.prepare('SELECT COUNT(*) AS count FROM tasks').get();
if (countResult.count === 0) {
    const insertStmt = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
    insertStmt.run('Task 1', 0);
    insertStmt.run('Task 2', 1);
    insertStmt.run('Task 3', 0);
    console.log('Inserted initial tasks into the database');
}

module.exports = db;

const port = 3000;

function getTask(id) {
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.get('/', (req, res) => {
  res.json({"name": "Task API", "version": "1.0", "endpoint": ["/tasks"]});
});

app.get('/health', (req, res) => {
  res.json({"status": "ok"});
});

app.get('/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  res.json(tasks);
});

app.get('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);
    const task = getTask(taskId);
    if (task && Object.keys(task).length !== 0) {
        res.json(task);
    } 
    else {
        res.status(404).json({ error: `Task ${taskId} not found` });
    }
});

app.post('/tasks', (req, res) => {
    if (!req.body.title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const newTask = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)').run(req.body.title, req.body.done ?? 0);

    res.status(201).json(newTask.changes ? { id: newTask.lastInsertRowid, title: req.body.title, done: req.body.done ?? 0 } : { error: 'Failed to create task' });
});

app.put('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);

    const existingTask = getTask(taskId);

    if (!existingTask) {
        return res.status(404).json({ error: `Task ${taskId} not found` });
    }

    if (req.body.title === undefined) {
        return res.status(400).json({ error: 'Empty request body (need title)' });
    }
    const task = db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(req.body.title, req.body.done ?? existingTask.done, taskId);
    
    res.json(task.changes ? { id: taskId, title: req.body.title, done: req.body.done ?? existingTask.done } : { id: taskId, title: req.body.title ?? existingTask.title, done: req.body.done ?? existingTask.done });
});

app.delete('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);
    const existingTask = getTask(taskId);
    if (!existingTask) {
        return res.status(404).json({ error: `Task ${taskId} not found` });
    }
    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    res.status(204).send();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});