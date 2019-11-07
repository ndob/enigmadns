/*
import getEnigmaInit from "./getEnigmaInit.js";
import {
    Enigma,
    utils,
    eeConstants
} from 'enigma-js';

var BN = require('bn.js');
var abi = require('ethereumjs-abi');

const EnigmaDNSErrorCode = {
    None: new BN(0, 10),
    AlreadyRegistered: new BN(1, 10),
    Unauthorized: new BN(2, 10)
};

class EnigmaDNS {
    constructor(enigma, accounts, contractAddress) {
        this.enigma = enigma;
        this.accounts = accounts;
        this.contractAddress = contractAddress;
    }

    async resolve(domain) {
        let result = await this.makeCall('resolve(string)', [
            [domain, 'string']
        ], 'string');

        return result[0];
    }

    async makeCall(funcSignature, args, retType) {
        let task = null;
        while (true) {
            try {
                let taskFn = funcSignature;
                let taskArgs = args;
                let taskGasLimit = 90000000;
                let taskGasPx = utils.toGrains(0.0001);
                task = await new Promise((resolve, reject) => {
                    this.enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, this.accounts[0], this.contractAddress)
                        .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
                        .on(eeConstants.ERROR, (error) => reject(error));
                });
                break;
            } catch (err) {
                console.log("ERROR:" + JSON.stringify(err));
                return null;
            }
        }

        console.log("Created compute task.");

        task = await this.enigma.getTaskRecordStatus(task);
        if (task.ethStatus != 1) {
            console.log("ERROR: getTaskRecordStatus");
            return null;
        }

        do {
            const sleep = m => new Promise(r => setTimeout(r, m));

            await sleep(1000);
            task = await this.enigma.getTaskRecordStatus(task);
            console.log('Waiting. Current Task Status is ' + task.ethStatus + '\r');
        } while (task.ethStatus != 2);

        if (task.ethStatus != 2) {
            console.log("Error: Task status != 2.");
            return null;
        }

        console.log('Completed. Final Task Status is ' + task.ethStatus + '\n');

        task = await new Promise((resolve, reject) => {
            this.enigma.getTaskResult(task)
                .on(eeConstants.GET_TASK_RESULT_RESULT, (result) => resolve(result))
                .on(eeConstants.ERROR, (error) => reject(error));
        });

        if (task.engStatus !== 'SUCCESS') {
            console.log("Error: Task status");
            return null;
        }

        task = await this.enigma.decryptTaskResult(task);

        let ret = abi.rawDecode([retType], Buffer.from(task.decryptedOutput, 'hex'))
        return ret;
    }
}
*/

const parseDomain = require("parse-domain");

function redirect(requestDetails) {
    const parsed = parseDomain(requestDetails.url, { customTlds: ["enigma"] });
    if (parsed && parsed.tld === "enigma") {
        console.log("Rewriting enigma url..");
        return {
            redirectUrl: "http://" + parsed.domain + ".com"
        };
    }

}

browser.webRequest.onBeforeRequest.addListener(
    redirect, {
        urls: ["<all_urls>"]
    },
    ["blocking"]
);

// const enigma = await getEnigmaInit();
// const accounts = await enigma.web3.eth.getAccounts();
