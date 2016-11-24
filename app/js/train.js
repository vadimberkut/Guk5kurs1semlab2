//const brain = require('brain.js');
const fs = nw.require('fs');
const fsExtra = nw.require('fs-extra');
//const mnist = require('mnist');

import brain from 'brain.js';
//import fs from 'fs';
//import mnist from 'mnist';


export default function(options = {}){
    
    return new Promise(function(resolve, reject) {
      try{
          
           const mnist = require('mnist');

            var net = new brain.NeuralNetwork();

            var trainingSetSize = options.trainingSetSize || 1000;

            const set = mnist.set(trainingSetSize, 0);
            var trainingSet = set.training;
            var log = options.log === undefined || options.log === null ? true : options.log;

            //console.log("trainingSet = ",trainingSet);

            console.log("options = ",options);
            if(options.trainLetters){
              var fContent = fsExtra.readFileSync('app/neural_network_data/lettersTrainData.json', 'utf8');
              //console.log("fContent = ",fContent);
              var trainingSetLetters = JSON.parse(fContent);
              trainingSet = trainingSet.concat(trainingSetLetters);
              //console.log("trainingSetLetters = ",trainingSetLetters);
            }

            net.train(trainingSet,
                {
                    errorThresh: options.errorThresh || 0.005,  // error threshold to reach
                    iterations: options.iterations || 20000,   // maximum training iterations
                    log: log,           // console.log() progress periodically
                    logPeriod: options.logPeriod || 1,       // number of iterations between logging
                    learningRate: options.learningRate || 0.3,    // learning rate
                    callback: options.callback,
                    callbackPeriod: options.callbackPeriod || 1
                }
            );

            let wstream = fs.createWriteStream('../neural_network_data/networkMemory.json');
            wstream.write(JSON.stringify(net.toJSON(),null,2));
            wstream.end();

            console.log('MNIST dataset with Brain.js train done.')

            resolve({msg:"train done.", status: true});
          
      }catch(e){
          reject({msg: e, status: false});
      }
      // resolve(результат) при успешном выполнении
      // reject(ошибка) при ошибке
    })
}