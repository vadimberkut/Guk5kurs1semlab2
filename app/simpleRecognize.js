const brain = require('brain.js'),
      fs = require('fs'),
      mnist = require('mnist');
      //softmax = require('./js/softmax');

var net = new brain.NeuralNetwork();

const set = mnist.set(0, 1);

//const trainingSet = set.training;
const testSet = set.test;

net.fromJSON(require('./neural_network_data/mnistTrain.json'));


var output = net.run(testSet[0].input);


console.log(testSet[0].input.reduce(function(e,ac,i){
    return ""+ac+"_"+e;
}));
console.log(testSet[0].output);
console.log(softmax(output));



function softmax(output) {
    var maximum = output.reduce(function(p,c) { return p>c ? p : c; });
    var nominators = output.map(function(e) { return Math.exp(e - maximum); });
    var denominator = nominators.reduce(function (p, c) { return p + c; });
    var softmax = nominators.map(function(e) { return e / denominator; });

    var maxIndex = 0;
    softmax.reduce(function(p,c,i){if(p<c) {maxIndex=i; return c;} else return p;});

    var result = [];

    for (var i=0; i<output.length; i++)
    {
        if (i==maxIndex)
            result.push(1);
        else
            result.push(0);
    }

    return result;
}