'use strict';

var slConfig = require('./lib/config'),
    groot = require('./lib/groot'),
    helpers = require('./lib/helpers'),
    slRules = require('./lib/rules'),
    glob = require('glob'),
    path = require('path'),
    fs = require('fs-extra');


var sassLint = function (config) {
  config = require('./lib/config')(config);
  return;
};

sassLint.getConfig = function (config, configPath) {
  return slConfig(config, configPath);
};

sassLint.lintText = function (file, options, configPath) {
  var rules = slRules(this.getConfig(options, configPath)),
      ast = groot(file.text, file.format, file.filename),
      detects,
      results = [],
      errors = 0,
      warnings = 0;

  rules.forEach(function (rule) {
    detects = rule.rule.detect(ast, rule);
    results = results.concat(detects);
    if (detects.length) {
      if (rule.severity === 1) {
        warnings += detects.length;
      }
      else if (rule.severity === 2) {
        errors += detects.length;
      }
    }
  });

  results.sort(helpers.sortDetects);

  return {
    'filePath': file.filename,
    'warningCount': warnings,
    'errorCount': errors,
    'messages': results
  };
};

sassLint.lintFiles = function (files, options, configPath) {
  var that = this,
      results = [];

  if (files) {
    files = glob.sync(files);
  }
  else {
    files = this.getConfig(options, configPath).files;

    if (typeof files === 'string') {
      files = glob.sync(files);
    }
    else {
      files = glob.sync(files.include, {
        'ignore': files.ignore
      });
    }
  }

  files.forEach(function (file) {
    var lint = that.lintText({
      'text': fs.readFileSync(file),
      'format': path.extname(file).replace('.', ''),
      'filename': file
    }, options, configPath);
    results.push(lint);
  });

  return results;
};


sassLint.format = function (results, options, configPath) {
  var config = this.getConfig(options, configPath);

  var formatted = require('eslint/lib/formatters/' + config.options.formatter);

  return formatted(results);
};

sassLint.outputResults = function (results, options, configPath) {
  var config = this.getConfig(options, configPath);

  if (config.options['output-file']) {
    fs.outputFileSync(path.resolve(process.cwd(), config.options['output-file']), results);
  }
  else {
    console.log(results);
  }
  return results;
};

sassLint.failOnError = function (results) {
  var result,
      i;

  for (i = 0; i < results.length; i++) {
    result = results[i];

    if (result.errorCount > 0) {
      throw new Error(result.errorCount + ' errors detected in ' + result.filePath);
    }
  }
};

module.exports = sassLint;

