const crypto = require('crypto');
const express = require('express'),
    axios = require('axios'),
    app = express(),
    _ = require('lodash'),
    bodyParser = require('body-parser'),
    path = require('path'),
    fs = require('fs-extra'),
    moment = require('moment'),
    request = require('request');

var questionList = new Map();

async function updateQuestionList(eventId, stageId) {
    const { data } = await axios.get(
        "https://v01959iun4.execute-api.eu-central-1.amazonaws.com/prod/public/386293b6-e806-444f-b351-0c138abbeffe/questions");

    for (let question of data) {
        if (!questionList.has(question.id)) {
            questionList.set(question.id, {
                id: question.id,
                userName: question.userName,
                answered: false,
                approved: question.approved,
                text: question.question,
                stageID: question.stageID
            });
        }
    }
}

async function writeQuestionListToFile() {
    let result = [];

    for (const [key, value] of questionList.entries()) {
        result.push(JSON.stringify(value));
    }

    fs.writeFileSync('./resources/question-list.json', "[" + result.join(",") + "]", function (err) {
        if (err) throw err;
        console.log('Question list saved');
    });
}

async function restoreQuestionListFromFile() {
    if (fs.existsSync('./resources/question-list.json')) {
        fs.readFile('./resources/question-list.json', (err, data) => {
            if (err) throw err;
            readData(JSON.parse(data));
        });
    } else {
        await updateQuestionList();
        await writeQuestionListToFile();
    }
}
function readData(content) {
    for (let question of content) {
        questionList.set(question.id, question);
    }
}

function getFileData(content) {
    return content;
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// API
app.get('/api/questionList', async (req, res) => {
    let result = [];
    for (const [key, value] of questionList.entries()) {
        if (value.stageID == req.query.stageId) {
            result.push(value);
        }
    }

    res.json(result);
})

app.post('/api/updateQuestionList', async (req, res) => {
    let updatedObject = questionList.get(req.body.questionId);
    updatedObject.answered = req.body.answered;
    questionList.set(req.body.questionId, updatedObject);
    await writeQuestionListToFile();
    res.json("OK");
})

app.use(express.static('public'))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(8000, async () => {
    console.log("System: Listening on 8000");
    await restoreQuestionListFromFile();
});

process.on('uncaughtException', err => {
    console.error(err && err.stack);
});
