var path = require('path');
var configFile = path.join(__dirname, "config.json");
var exec = require('child_process').exec;
var fs = require('fs');
var jerk = require('jerk');
var last_said = new Array();
var options = JSON.parse(fs.readFileSync(process.argv[2] || configFile));
var path = require('path');
var sed_regexp = /^(s[^a-zA-Z0-9].*)$/;
var sed_binary = process.env.SEDBOT_SEDBIN || 'sed';

var channel = options.channels;

var sed_bot = jerk(function(j) {
  j.watch_for( /^(.+)$/, function(message) {
    var result = sed_regexp.exec(message.match_data[1]);
    if (result) {
      if (!last_said[message.user]) {
        return
      }
      var command = "echo '" + last_said[message.user].replace(/'/g, "'\"'\"'") + "' | " + sed_binary +" -e '" + result[1].replace(/'/g, "'\"'\"'") + "'"
      exec(command, function(error, stdout, stderr) {
        if (error) {
          message.say("ERROR: " + stderr);
        }
        else {
          // Get rid of any newlines that may have creeped in.
          sanitized_stdout = stdout.split(String.fromCharCode(10))[0];
          if (sanitized_stdout == null || sanitized_stdout == undefined || sanitized_stdout == '') {
            message.say('Sorry - that results in nothing left to say. Please try again.')
            return
          }
          message.say('What ' + message.user + ' meant to say was:');
          message.say(sanitized_stdout);
          // Put the message back into the last_said array for further sed fun.
          last_said[message.user] = sanitized_stdout;
        }
      });
    }
    else {
      last_said[message.user] = message.match_data[1];
    }
  })
}).connect(options)

