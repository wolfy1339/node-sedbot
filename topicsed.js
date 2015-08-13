#!/usr/bin/env node

// Download http://lvogel.free.fr/jsed/jsed.js to "sed.js" and append "module.exports = sed;" to the end of the file.

var irc = require('node-irc');
var fs = require('fs');
var path =  require('path');
var sed = require('./sed.js');

var options = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"));
var dataFile = path.join(__dirname, "topicsed.json");

var historytopic = {};
var pretopic = {};
var restore = function () {
    var data = JSON.parse(fs.readFileSync(dataFile).toString('utf8'));
    historytopic = data.historytopic ? data.historytopic : {};
    pretopic = data.pretopic ? data.pretopic : {};
};
var dump = function () {
    fs.writeFileSync(dataFile, JSON.stringify({'historytopic':historytopic,'pretopic':pretopic}));
};
restore();
var client = new irc.Client(options.server, 'topicsed', {
    options.irc
});
client.on('error', function (e) {
    console.error('An unexpected error occured: ', e);
});
client.on('topic', function (channel, topic, nick, message) {
    if (match = topic.match(/^: -([0-9]+)?$/)) {
        if (historytopic[channel] === undefined) {
            return;
        }
        match = Number(match[1]);
        if (isNaN(match)) {
            match = 1;
        }
        if (match > historytopic[channel].length) {
            match = historytopic[channel].length;
        }
        var topictoset = historytopic[channel].splice(historytopic[channel].length - match, 1);
        if (match === 0) {
            topictoset = pretopic[channel];
        }
        client.say('ChanServ', 'TOPIC ' + channel + ' ' + topictoset);
        return;
    }
    var aborted = false;
    var cb = function (data) {
        if (data.length && data.split(/\r?\n/).length > 1) {
            client.say('ChanServ', 'TOPIC ' + channel + ' ' + data);
        }
    }
    var stdout = function (data) {
        if (aborted) return;
        cb(data);
        aborted = true;
    };
    var stderr = function (data) {
        if (aborted) return;
        if (historytopic[channel] === undefined) {
            historytopic[channel] = [];
        }
        if (historytopic[channel][historytopic[channel].length - 1] !== pretopic[channel] && pretopic[channel] !== topic) {
            historytopic[channel].push(pretopic[channel]);
        }
        pretopic[channel] = topic;
        aborted = true;
        dump();
    };
    sed.out = stdout;
    sed.err = stderr;
    sed.compile(topic);
    if (!aborted) {
        sed.execute(pretopic[channel] ? pretopic[channel] : '');
    }
});
