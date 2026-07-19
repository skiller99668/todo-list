const express = require('express');
const app = express();
const port = 3000;

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

app.get('/tasks', (req, res) => {
  res.json(tasks);
});

app.get('/tasks/:id', (req, res) => {
    const taskId = parseInt(req.params.id);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        res.json(task);
    } else {
        res.status(404).json({ error: `Task ${taskId} not found` });
    }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});