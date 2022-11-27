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

let eventId = "2a4c9d8b-e60d-4de0-b5aa-6431bb123a95";
let serverPort = 8080;
let questionList = new Map();
let answeredList = new Map();

async function updateQuestionList() {
    console.log("Get question list from server");

    const { data } = await axios.get(
        "https://v01959iun4.execute-api.eu-central-1.amazonaws.com/prod/public/" + eventId + "/questions");

    questionList.clear();

    for (let question of data) {
        questionList.set(question.id, {
            id: question.id,
            userName: question.userName,
            approved: question.approved,
            text: question.question,
            stageID: question.stageID
        });
    }
}

function restoreAnsweredList() {
    console.log("Trying to restore answered list from file");
    if (fs.existsSync('./resources/question-list.json')) {
        fs.readFile('./resources/question-list.json', (err, data) => {
            if (err) throw err;

            if (data.toString().length > 0) {
                console.log("Found preserved data")
                putNewAnsweredQuestion(JSON.parse(data));
            } else {
                console.log("Local answered list is empty")
            }
        });
    }
}

async function writeQuestionListToFile() {
    let result = [];

    for (const [key, value] of answeredList.entries()) {
        result.push(JSON.stringify({
            id: key,
            answered: value
        }));
    }

    console.log('Saving answered list');
    fs.writeFile('./resources/question-list.json', "[" + result.join(",") + "]", (err) => {
        if (err) throw err;
        console.log('Answered list saved');
    });
}

function putNewAnsweredQuestion(content) {
    for (let question of content) {
        answeredList.set(question.id, question.answered);
    }
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// API
app.get('/api/questionList/:stageId', (req, res) => {
    let result = [];
    console.log(questionList)
    for (const [key, value] of questionList.entries()) {
        if (value.stageID === req.params.stageId) {
            let questionObject = value;
            if (answeredList.has(value.id)) {
                questionObject.answered = answeredList.get(value.id);
            } else {
                questionObject.answered = false;
            }
            result.push(questionObject);
        }
    }
    res.json(result);
})

app.post('/api/updateQuestion', async (req, res) => {
    answeredList.set(req.body.questionId, req.body.answered)
    await writeQuestionListToFile();
    res.json("OK");
})

// Server
app.use(express.static('public'))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(serverPort, async () => {
    console.log("System: Listening on " + serverPort);
    await updateQuestionList();
    restoreAnsweredList();

    setInterval(async function() {
        await updateQuestionList();
        console.log("Trigger update");
    }, 30000)
});

process.on('uncaughtException', err => {
    console.error(err && err.stack);
});
