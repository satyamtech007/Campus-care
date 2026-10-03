const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Path to the tasks directory
const tasksDir = path.join(__dirname, 'tasks');

// Requirement 1: Create tasks/ folder if it doesn't exist on startup
fs.mkdirSync(tasksDir, { recursive: true });

// Middleware to parse JSON request bodies
app.use(express.json());

/**
 * Route: POST /tasks
 * Purpose: Create a new task file
 * - Reads `title` and `description` from req.body
 * - Returns 400 if title is missing or only whitespace
 * - Sanitizes title to be safe for filenames (removes / \ : * ? " < > | and ..)
 * - Returns 400 if cleaned title is empty
 * - Saves description to tasks/<cleanTitle>.txt using fs.writeFile
 * - Return 201 on success and 500 on error
 */
app.post(['/tasks', '/tasks/'], async (req, res) => {
    try {
        const { title, description } = req.body;

        // Return 400 if title is missing or only spaces
        if (!title || typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({ error: 'Title is required and cannot be empty or only spaces' });
        }

        // Sanitize the title for use as a filename: remove / \ : * ? " < > | and ..
        let cleanTitle = title.replace(/[\\/:*?"<>|]/g, '').replace(/\.\./g, '').trim();

        // Return 400 if the cleaned title is empty
        if (!cleanTitle) {
            return res.status(400).json({ error: 'Cleaned title cannot be empty' });
        }

        // Target file path: tasks/<cleanTitle>.txt
        const fileName = `${cleanTitle}.txt`;
        const filePath = path.join(tasksDir, fileName);
        const fileContent = typeof description === 'string' ? description : '';

        // Save description using fs.writeFile (fs.promises.writeFile)
        await fs.promises.writeFile(filePath, fileContent, 'utf-8');

        // Return 201 on success
        return res.status(201).json({
            message: 'Task created successfully',
            title: cleanTitle,
            fileName: fileName
        });
    } catch (error) {
        console.error('Error creating task:', error);
        // Return 500 on error
        return res.status(500).json({ error: 'Failed to create task' });
    }
});

/**
 * Route: GET /tasks
 * Purpose: Retrieve a list of all tasks
 * - Uses fs.readdir to list all files in tasks/ folder
 * - Filters for .txt files
 * - Uses fs.readFile to get a short preview of each file
 * - Returns JSON with the title (filename without .txt) and the preview
 */
app.get(['/tasks', '/tasks/'], async (req, res) => {
    try {
        // Read the directory contents
        const files = await fs.promises.readdir(tasksDir);

        // Filter only .txt files
        const txtFiles = files.filter(file => file.endsWith('.txt'));

        // Read short preview for each file concurrently
        const taskList = await Promise.all(
            txtFiles.map(async (file) => {
                const filePath = path.join(tasksDir, file);
                const content = await fs.promises.readFile(filePath, 'utf-8');

                // Title is filename without .txt
                const title = path.basename(file, '.txt');

                // Short preview (up to 100 characters)
                const preview = content.length > 100 ? content.slice(0, 100) + '...' : content;

                return {
                    title,
                    preview
                };
            })
        );

        // Return JSON with the title and preview
        return res.json(taskList);
    } catch (error) {
        console.error('Error retrieving tasks:', error);
        return res.status(500).json({ error: 'Failed to retrieve tasks' });
    }
});

/**
 * Route: GET /tasks/:name
 * Purpose: Read and return the full content of a specific task
 * - Uses req.params.name to identify the target file
 * - Blocks path traversal attempts
 * - Uses fs.readFile to read the full content
 * - Returns 404 if the file doesn't exist
 */
app.get('/tasks/:name', async (req, res) => {
    try {
        const { name } = req.params;

        // Block path traversal: disallow path traversal tokens
        if (!name || name.includes('..') || name.includes('/') || name.includes('\\') || name.includes('%2e') || name.includes('%2f')) {
            return res.status(400).json({ error: 'Access denied: invalid file name or path traversal detected' });
        }

        // Allow lookup with or without .txt extension
        const fileName = name.endsWith('.txt') ? name : `${name}.txt`;
        const resolvedTasksDir = path.resolve(tasksDir);
        const safeFilePath = path.resolve(tasksDir, fileName);

        // Verify that the resolved path stays strictly inside tasksDir
        if (!safeFilePath.startsWith(resolvedTasksDir + path.sep)) {
            return res.status(403).json({ error: 'Access denied: path traversal detected' });
        }

        // Read the full file content using fs.readFile
        const content = await fs.promises.readFile(safeFilePath, 'utf-8');

        // Return plain text if specifically requested, otherwise return JSON
        if (req.headers.accept === 'text/plain') {
            return res.send(content);
        }

        return res.json({
            title: path.basename(fileName, '.txt'),
            content: content,
            description: content
        });
    } catch (error) {
        // Return 404 if the file doesn't exist
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Task not found' });
        }
        console.error('Error reading task file:', error);
        return res.status(500).json({ error: 'Failed to read task file' });
    }
});

/**
 * Route: DELETE /tasks/:name (Helper route for UI delete action)
 * Purpose: Delete a specific task file
 */
app.delete('/tasks/:name', async (req, res) => {
    try {
        const { name } = req.params;

        // Block path traversal
        if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
            return res.status(400).json({ error: 'Invalid task name' });
        }

        const fileName = name.endsWith('.txt') ? name : `${name}.txt`;
        const resolvedTasksDir = path.resolve(tasksDir);
        const safeFilePath = path.resolve(tasksDir, fileName);

        if (!safeFilePath.startsWith(resolvedTasksDir + path.sep)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await fs.promises.unlink(safeFilePath);
        return res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Task not found' });
        }
        console.error('Error deleting task file:', error);
        return res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Middleware to serve static front-end files (index.html, script.js, style.css)
// Placed after API routes so that /tasks is handled by the API route and not static folder redirection
app.use(express.static(__dirname));

// Start Express server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});