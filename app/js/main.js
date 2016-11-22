//var imgUtil = require('./imgUtil.js');
//var neuralNetwork = require('./nn.js');

import imgUtil from './imgUtil.js';
import neuralNetwork from './nn.js';
import trainNeuralNetwork from './train.js';

var fs = nw.require('fs');
var path = require('path');
var getPixels = require("get-pixels");

document.addEventListener("DOMContentLoaded", start);
function start(){
    
    //DIFITS RECOGNITION
    var canvas = document.getElementById('sketchpad');
    var context = canvas.getContext('2d');
    var context2 = document.getElementById('sketchpad2').getContext("2d");
    var thumbnailCtx = document.getElementById('thumbnail').getContext("2d");
    var footprint = {
            width: 28,
            height: 28
        };
    var zoom = 10;
    
    var clearer = function clearer () {
            context.fillStyle = "white";
            context.fillRect(0,0,footprint.width*zoom,footprint.height*zoom);
            context2.fillStyle = "white";
            context2.fillRect(0,0,footprint.width*zoom,footprint.height*zoom);
            thumbnailCtx.fillStyle = "white";
            thumbnailCtx.fillRect(0,0,footprint.width,footprint.height);
            document.getElementById('result').innerText = '';
            //isRecognized = false;
        };

    var sketchpad = new Sketchpad({
        element: '#sketchpad',
        width: footprint.width*zoom,
        height: footprint.height*zoom,
        penSize: 10
    });
    sketchpad.color = "#000";
    //sketchpad.penSize = 10;
    //sketchpad.toJSON()
    //sketchpad.toObject()
    //
    //var settings = sketchpad.toObject()
    //settings.element = '#other-sketchpad'
    //var otherSketchpad = new Sketchpad(settings)

     window.sketchpad = sketchpad;
    console.log("sketchpad = ",sketchpad);
    
    
    // Clear canvas
    document.getElementById('sketchClearButton').addEventListener('click', function (event) {
        event.preventDefault();
        clearer();
    }, false)
    
    //Load image from file
    document.getElementById('openImageFileForm').onsubmit = function(e){
        e.preventDefault();
        var form = e.target;
        var fileInput = form.elements["imageFileInput"];
        var path = fileInput.value;
        console.log(path);

        ////resize image


        //var content = fs.readFileSync(path).toString();
        //console.log(content);

        //shape = [width, height, channels]
        getPixels(path, function(err, pixels) {
            if(err) {
                console.log("Bad image path");
                return
            }
            console.log("pixels", pixels);
            console.log("got pixels", pixels.shape.slice());

            var grayscale = getGrayscaleFromPixels(pixels);
            console.log("grayscale", grayscale);

            //var imgData = context.createImageData(footprint.width*zoom,footprint.height*zoom);
            var imgData = context.createImageData(96,96);
            for (var i=0;i<imgData.data.length;i+=4)
            {
                imgData.data[i+0]=grayscale[i];
                imgData.data[i+1]=grayscale[i+1];
                imgData.data[i+2]=grayscale[i+2];
                imgData.data[i+3]=255;
            }
            context.putImageData(imgData, 0, 0);
        })
    };

    //Get grayscale image from pixels
    function getGrayscaleFromPixels(pixels){
        var shape = pixels.shape;
        var data = pixels.data;

        var width = shape[0];
        var height = shape[1];
        var channels = shape[2];

        var size = width*height*channels;

        var grayscale = [];
        for(var i = 0; i < size; i+=channels){
            var gray = (data[i] + data[i+1] + data[i+2])/3.0;
            gray = Math.round(gray);
            grayscale.push(gray);
        }
        return grayscale;
    }

    //Recognise
    document.getElementById("sketchRecogniseButton").onclick = function(e){
//        var settings = sketchpad.toObject();
//        console.log("settings = ",settings);
        
        e.preventDefault();

        var imgData = context.getImageData(0, 0, 280, 280);
        
        var grayscaleImg = imgUtil.imageDataToGrayscale(imgData);
        var boundingRectangle = imgUtil.getBoundingRectangle(grayscaleImg, 0.01);
        var trans = imgUtil.centerImage(grayscaleImg); // [dX, dY] to center of mass
        
        //console.log(grayscaleImg);
        //console.log(boundingRectangle);
        //console.log(trans);

        // copy image to hidden canvas, translate to center-of-mass, then
        // scale to fit into a 200x200 box (see MNIST calibration notes on
        // Yann LeCun's website)
        var canvasCopy = document.createElement("canvas");
        canvasCopy.width = imgData.width;
        canvasCopy.height = imgData.height;
        var copyCtx = canvasCopy.getContext("2d");
        var brW = boundingRectangle.maxX+1-boundingRectangle.minX;
        var brH = boundingRectangle.maxY+1-boundingRectangle.minY;
        var scaling = 190 / (brW>brH?brW:brH);
        // scale
        copyCtx.translate(canvas.width/2, canvas.height/2);
        copyCtx.scale(scaling, scaling);
        copyCtx.translate(-canvas.width/2, -canvas.height/2);
        // translate to center of mass
        copyCtx.translate(trans.transX, trans.transY);

        copyCtx.drawImage(context.canvas, 0, 0);

        // now bin image into 10x10 blocks (giving a 28x28 image)
        imgData = copyCtx.getImageData(0, 0, 280, 280);
        grayscaleImg = imgUtil.imageDataToGrayscale(imgData);
        //console.log(grayscaleImg);

        var nnInput = new Array(784),  nnInput2 = [];
        for (var y = 0; y < 28; y++) {
            for (var x = 0; x < 28; x++) {
                var mean = 0;
                for (var v = 0; v < 10; v++) {
                    for (var h = 0; h < 10; h++) {
                        mean += grayscaleImg[y*10 + v][x*10 + h];
                    }
                }
                mean = (1 - mean / 100); // average and invert
                nnInput[x*28+y] = (mean - .5) / .5;
            }
        }

        var thumbnail =  thumbnailCtx.getImageData(0, 0, footprint.width, footprint.height);


        // for visualization/debugging: paint the input to the neural net.
        //if (document.getElementById('preprocessing').checked == true) {
        if (true) {
            context2.clearRect(0, 0, canvas.width, canvas.height);
            context2.drawImage(copyCtx.canvas, 0, 0);
            for (var y = 0; y < 28; y++) {
                for (var x = 0; x < 28; x++) {
                    var block = context.getImageData(x * 10, y * 10, 10, 10);
                    var newVal = 255 * (0.5 - nnInput[x*28+y]/2);
                    nnInput2.push(Math.round((255-newVal)/255*100)/100);
                    for (var i = 0; i < 4 * 10 * 10; i+=4) {
                        block.data[i] = newVal;
                        block.data[i+1] = newVal;
                        block.data[i+2] = newVal;
                        block.data[i+3] = 255;
                    }
                    context2.putImageData(block, x * 10, y * 10);

                    thumbnail.data[(y*28 + x)*4] = newVal;
                    thumbnail.data[(y*28 + x)*4 + 1] = newVal;
                    thumbnail.data[(y*28 + x)*4 + 2] = newVal;
                    thumbnail.data[(y*28 + x)*4 + 3] = 255;
                }
            }
        }
        thumbnailCtx.putImageData(thumbnail, 0, 0);


       // console.log("nnInput2=",nnInput2);
        
        console.log("nnInput2=",nnInput2.reduce(function(e,ac,i){
            return ""+ac+"_"+e;
        }));
        
        
        var output = neuralNetwork(nnInput2);
        console.log("output=",output);
        var maxIndex = 0;
        output.reduce(function(p,c,i){if(p<c) {maxIndex=i; return c;} else return p;});
        console.log('Detect1: '+maxIndex);
        document.getElementById('result').innerText = maxIndex.toString();
        //isRecognized = true;
    }
    
    //Train
    document.getElementById("trainNetworkForm").onsubmit = function(e){
        e.preventDefault();
        console.log(e);
        var form = e.target;
        
        document.getElementById("preloader").className = "";
        
        var trainingSetSize = form.elements["trainingSetSize"].value;
        var errorThresh = form.elements["errorThresh"].value;
        var iterations = form.elements["iterations"].value;
        var log = form.elements["log"].checked;
        var logPeriod = form.elements["logPeriod"].value;
        var learningRate = form.elements["learningRate"].value;
        
        var options = {
            trainingSetSize,
            errorThresh,
            iterations,
            log,
            logPeriod,
            learningRate,
            callback: function(data){
                document.getElementById("trainingLog").innerHTML += "iterations: " + data.iterations + " , error: " + data.error + "\n";
            },
            callbackPeriod: 1
        };
        
        document.getElementById("trainingLog").innerHTML = "";
        
        setTimeout(function(){
            trainNeuralNetwork(options).then(function(result){
                document.getElementById("preloader").className = "hidden";
                document.getElementById("trainingLog").innerHTML +=result.msg;
            }, function(error){
                document.getElementById("preloader").className = "hidden";
                window.alert(error.msg);
            });
        },500);
        
//        trainNeuralNetwork(options).then(function(result){
//            document.getElementById("preloader").className = "hidden";
//            document.getElementById("trainingLog").innerHTML +=result.msg;
//        }, function(error){
//            document.getElementById("preloader").className = "hidden";
//            window.alert(error.msg);
//        });
    }
    
    
    //TIME SERIES
    
}

