'use strict';

var gulp = require('gulp');  // Base gulp package
var babelify = require('babelify'); // Used to convert ES6 & JSX to ES5
var browserify = require('browserify'); // Providers "require" support, CommonJS
var notify = require('gulp-notify'); // Provides notification to both the console and Growel
var rename = require('gulp-rename'); // Rename sources
var sourcemaps = require('gulp-sourcemaps'); // Provide external sourcemap files
var livereload = require('gulp-livereload'); // Livereload support for the browser
var gutil = require('gulp-util'); // Provides gulp utilities, including logging and beep
var chalk = require('chalk'); // Allows for coloring for logging
var source = require('vinyl-source-stream'); // Vinyl stream support
var buffer = require('vinyl-buffer'); // Vinyl stream support
var watchify = require('watchify'); // Watchify for source changes
var merge = require('utils-merge'); // Object merge tool
var duration = require('gulp-duration'); // Time aspects of your gulp process

var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');

var reactify = require('reactify');

//var fs = require('fs');
var fs = require('fs-extra');
var gm = require('gm');
var mnist = require('mnist');
var imagemin = require('gulp-imagemin');
var imageResize = require('gulp-image-resize');
var PNG = require('pngjs').PNG;

// Configuration for Gulp
var config = {
  js: {
    src: './app/js/main.js',
    watch: './app/**/*.+(js|jsx|json)',
    outputDir: './app/js/',
    outputFile: 'bundle.js',
  },
};

// Error reporting function
function mapError(err) {
  if (err.fileName) {
    // Regular error
    gutil.log(chalk.red(err.name)
      + ': ' + chalk.yellow(err.fileName.replace(__dirname + '/src/js/', ''))
      + ': ' + 'Line ' + chalk.magenta(err.lineNumber)
      + ' & ' + 'Column ' + chalk.magenta(err.columnNumber || err.column)
      + ': ' + chalk.blue(err.description));
  } else {
    // Browserify error..
    gutil.log(chalk.red(err.name)
      + ': '
      + chalk.yellow(err.message));
  }
}

// Completes the final file outputs
function bundle(bundler) {
  var bundleTimer = duration('Javascript bundle time');

  bundler
    .bundle()
    .on('error', mapError) // Map error reporting
    //.pipe(source('main.jsx')) // Set source name
    .pipe(source('./app/js/main.js')) // Set source name
    .pipe(buffer()) // Convert to gulp pipeline
    .pipe(rename(config.js.outputFile)) // Rename the output file
    .pipe(sourcemaps.init({loadMaps: true})) // Extract the inline sourcemaps
    .pipe(sourcemaps.write('./map')) // Set folder for sourcemaps to output to
    .pipe(gulp.dest(config.js.outputDir)) // Set the output folder
    .pipe(notify({
      message: 'Generated file: <%= file.relative %>',
    })) // Output the file being created
    .pipe(bundleTimer) // Output time timing of the file creation
    .pipe(livereload()); // Reload the view in the browser
}

//SASS
//gulp.task('sass', function(){
//  return gulp.src('app/styles/sass/**/*.+(scss|sass)')
//      .pipe(sass())
//      .pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], {cascade: true}))
//      .pipe(gulp.dest('app/styles/css'));
//});

// Watch Task (Gulp task for build)
gulp.task('watch', function() {
  livereload.listen(); // Start livereload server

  //SCRIPTS
  var args = merge(watchify.args, { debug: true }); // Merge in default watchify args with browserify arguments

  var bundler = browserify(config.js.src, args) // Browserify
    .plugin(watchify, {ignoreWatch: ['**/node_modules/**', '**/bower_components/**']}) // Watchify to watch source file changes
    .transform(babelify, {presets: ['es2015', 'react']}); // Babel tranforms

  bundle(bundler); // Run the bundle the first time (required for Watchify to kick in)

  bundler.on('update', function() {
    bundle(bundler); // Re-run bundle on source updates
  });

  //STYLES
  //gulp.watch('app/styles/sass/**/*.+(scss|sass)', ['sass']).on('change', livereload.changed);
});

//mnist
gulp.task('img-mnist', function(){
  //var set = mnist.set(1);
  //console.log(set);

  for(var digit = 0; digit <= 9; digit++){
    //var samples = mnist[digit].get(1); // [0,0,0,1,1...,0,0]
    var samples = mnist[digit].range(1,10);

    samples.forEach(function(sample, j){
      var png = new PNG({
        width: 28,
        height: 28
      });

      var i = 0;
      for (var y = 0; y < png.height; y++) {
        for (var x = 0; x < png.width; x++) {
          var idx = (png.width * y + x) << 2;

          // invert color
          png.data[idx] = sample[i] == 0 ? 255 : 0;
          png.data[idx+1] = sample[i] == 0 ? 255 : 0;
          png.data[idx+2] = sample[i] == 0 ? 255 : 0;

          // and reduce opacity
          png.data[idx+3] = 255;
          i += 1;
        }
      }
      png.pack().pipe(fs.createWriteStream("./app/images/mnist/" + digit + "_" + j +".png"));
    });
  }
});

//LETTERS
gulp.task('img-letters-resize', function(){

  var sourcePath = "./app/images/letters";
  var destAllPath = "./app/images/letters/all";
  var destPath = "./app/images/letters_resized";

  var folderStructure = {
    upper: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
    lower: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']
  };

  for(var p in folderStructure){
    if(!folderStructure.hasOwnProperty(p))
      continue;
    var folder = p;
    var folders = folderStructure[p];

    //WRITE FILES IN ONE FOLDER AND RENAME
    folders.forEach(function(letterFolder, i, arr){
      var currPath = sourcePath + "/" + folder + "/" + letterFolder;

      fs.readdir(currPath, function(err, filenames) {
        if (err) {
          console.log(err);
          return;
        }
        filenames.forEach(function(filename) {
          var fileExtension = filename.split('.').slice(-1)[0];
          if(fileExtension != 'png' && fileExtension != 'jpeg' && fileExtension != 'jpg' && fileExtension != 'gif')
            return;
          var sourceFileName = currPath + "/" + filename;
          var destFileName = destAllPath + "/" + letterFolder + "_" + folder + "_" + filename;
          console.log("Copy file From ",sourceFileName," To ",destFileName);
          //fs.createReadStream(sourceFileName).pipe(fs.createWriteStream(destFileName));
          fs.copySync(sourceFileName,destFileName);
        });
      });
    });
  }
});

//USE DASTSTONE INSTEAD
gulp.task('img-letters-convert-to-png', function(){

  //var sourcePath = "./app/images/letters/all/A_lower_0.gif";
  //var tempPath = "./app/images/letters/temp/A_lower_0.png";
  //var destPath = "./app/images/letters_converted";
  //
  //var writeStream = fs.createWriteStream(tempPath);
  //gm(sourcePath).setFormat("png").write(writeStream, function(error){
  //  console.log("Finished saving", error);
  //});
});
gulp.task('img-letters-invert-colors', function(){

  var sourcePath = "./app/images/letters/png";
  var destPath = "./app/images/letters/inverted";

  fs.readdir(sourcePath, function(err, filenames) {
    if (err) {
      console.log(err);
      return;
    }
    filenames.forEach(function(filename) {
      var fileExtension = filename.split('.').slice(-1)[0];
      if(fileExtension != 'png' && fileExtension != 'jpeg' && fileExtension != 'jpg' && fileExtension != 'gif')
        return;
      var sourceFileName = sourcePath + "/" + filename;
      var destFileName = destPath + "/" + filename;
      console.log("Process file From ",sourceFileName," To ",destFileName);
      Invert(sourceFileName, destFileName);
    });
  });

  function Invert(source, dest){
    fs.createReadStream(source)
        .pipe(new PNG({
          filterType: 4
        }))
        .on('parsed', function() {

          for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
              var idx = (this.width * y + x) << 2;

              // invert color
              this.data[idx] = 255 - this.data[idx];
              this.data[idx+1] = 255 - this.data[idx+1];
              this.data[idx+2] = 255 - this.data[idx+2];

              // and reduce opacity
              //this.data[idx+3] = this.data[idx+3] >> 1;

              //binarise
              var thresh = 100;
              var mean = (this.data[idx] + this.data[idx+1] + this.data[idx+2])/3;
              var value = 0;
              if(mean > thresh)
                value = 255;

              this.data[idx] = value;
              this.data[idx+1] = value;
              this.data[idx+2] = value;
            }
          }
          this.pack().pipe(fs.createWriteStream(dest));
        });
  }


});


//Prepare images
gulp.task('img-resize', function(){

  //var source = './app/images/mnist/*.+(png|jpg|jpeg)';
  //var dest = './app/images/mnist_resized';

  var source = './app/images/letters/inverted/*.+(png|jpg|jpeg)';
  var dest = './app/images/letters_resized';

  return  gulp.src(source)
      .pipe(imageResize({
        width: 28,
        height: 28,
        upscale : true
      }))
      .pipe(gulp.dest(dest))
});


//Imgs to JSON
gulp.task('prepare-letters-train-data', function(){
  var sourcePath = "./app/images/letters_resized";
  var destPath = "./app/neural_network_data/lettersTrainData.json";
  var destFileName = "lettersTrainData.json";

  fs.readdir(sourcePath, function(err, filenames) {
    if (err) {
      console.log(err);
      return;
    }
    var trainSet = [];
    filenames.forEach(function(filename, i) {
      var fileExtension = filename.split('.').slice(-1)[0];
      if(fileExtension != 'png' && fileExtension != 'jpeg' && fileExtension != 'jpg' && fileExtension != 'gif')
        return;
      var sourceFileName = sourcePath + "/" + filename;

      var letter = filename.split("_")[0];

      var data = {
        input: [], //len 28*28
        output: GetLetterOutput(letter) //len 26
      };
      fs.createReadStream(sourceFileName)
          .pipe(new PNG({
            filterType: 4
          }))
          .on('parsed', function() {

            for (var y = 0; y < this.height; y++) {
              for (var x = 0; x < this.width; x++) {
                var idx = (this.width * y + x) << 2;

                //binarise
                var thresh = 100;
                var mean = (this.data[idx] + this.data[idx+1] + this.data[idx+2])/3;
                var value = 0;
                if(mean > thresh)
                  value = 1;

                data.input.push(value);
              }
            }
            //this.pack().pipe(fs.createWriteStream(dest));
            //console.log(letter,data.output);
            trainSet.push(data);
            //console.log("Total set ",trainSet.length);
          });

      if(i===5000){
        setTimeout(function(){
          var json = JSON.stringify(trainSet);
          fs.writeFileSync(destPath,json, 'utf8');
          console.log("Writing to file... Total set ",trainSet.length);
        },5000);
      }

    });
  });


  function GetLetterOutput(letter){
    var alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    letter = letter.toLowerCase();
    var letterIndex  = alphabet.indexOf(letter);
    var output = [];
    alphabet.forEach(function(lett, i){
      if(i === letterIndex)
        output[i] = 1;
      else
        output[i] = 0;
    });
    return output;
  }

});

// Default Task
gulp.task('default', ['watch']);