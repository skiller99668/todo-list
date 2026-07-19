const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

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
    } 
    else {
        res.status(404).json({ error: `Task ${taskId} not found` });
    }
});

app.post('/tasks', (req, res) => {
    if (!req.body.title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    const newTask = {
        id: tasks.length + 1,
        title: req.body.title,
        done: false
    };

    tasks.push(newTask);
    res.status(201).json(newTask);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});