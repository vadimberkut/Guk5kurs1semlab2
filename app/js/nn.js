//var brain = require('brain.js'),
//    net = new brain.NeuralNetwork(),
//    softmax = require('./softmax.js'),
//    //json = require('json!../neural_network_data/mnistTrain.json');
//    json = require('../neural_network_data/mnistTrain.json');

import brain from 'brain.js';
import softmax from './softmax.js';
const fs = nw.require('fs');

export default function(input){
    
    var net = new brain.NeuralNetwork();
    var isInit = false;
    
    function init(){
        //import json from '../neural_network_data/mnistTrain.json';
        var json = fs.readFileSync('./app/neural_network_data/networkMemory.json').toString();
        json = JSON.parse(json);
        net.fromJSON(json);
        isInit = true;
    }

    if(!isInit)
        init();
    var output = net.run(input);
    return softmax(output);
}

//global.module.exports = function (input) {
//    var output = net.run(input);
//
//    return softmax(output);
//}