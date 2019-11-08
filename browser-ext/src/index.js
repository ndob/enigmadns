import getEnigmaInit from "./getEnigmaInit.js";
import {
    Enigma,
    utils,
    eeConstants
} from 'enigma-js';

const parseDomain = require("parse-domain");
const BN = require('bn.js');
const abi = require('ethereumjs-abi');

const EnigmaDNSErrorCode = {
    None: new BN(0, 10),
    AlreadyRegistered: new BN(1, 10),
    Unauthorized: new BN(2, 10)
};

class EnigmaDNS {
    constructor() {
        this.enigma = null;
        this.accounts = null;
        this.contractAddress = "0x88987af7d35eabcad95915b93bfd3d2bc3308f06b7197478b0dfca268f0497dc";
        this.enigmaInitialized = false;
        this.dnsCache = new Map();
        this.initEnigma();
    }

    async initEnigma() {
        this.enigma = await getEnigmaInit();
        this.accounts = await this.enigma.web3.eth.getAccounts();
        this.enigmaInitialized = true;
    }

    async resolve(domain) {
        if (!this.enigmaInitialized) {
            return "";
        }

        let cached = this.dnsCache.get(domain)
        // TODO: Expiration.
        if (cached) {
            return cached;
        }

        let result = await this.makeCall('resolve(string)', [
            [domain, 'string']
        ], 'string');

        this.dnsCache.set(domain, result[0]);
        return result[0];
    }

    async makeCall(funcSignature, args, retType) {
        if (!this.enigmaInitialized) {
            return "";
        }

        let task = null;
        let remainingRetries = 3;
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
                remainingRetries--;
                if (remainingRetries > 0) {
                    continue;
                }
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

async function redirect(requestDetails) {
    const parsed = parseDomain(requestDetails.url, {
        customTlds: ["enigma"]
    });
    if (parsed && parsed.tld === "enigma") {
        console.log("Resolving domain from Enigma... full url:" + requestDetails.url);
        let resolved = await g_enigmaDNS.resolve(parsed.domain);
        console.log("Rewriting enigma url with resolved address: " + resolved);
        // Not robust, but OK for testing. Fails e.g if
        // https://a.enigma/foo/blaaa.enigma
        const toBeReplaced = parsed.domain + "." + parsed.tld;
        let rewritten = requestDetails.url.replace(toBeReplaced, resolved);
        console.log("Redirecting to:" + rewritten);
        return {
            redirectUrl: rewritten
        };
    }

}

let g_enigmaDNS = new EnigmaDNS();

browser.webRequest.onBeforeRequest.addListener(
    redirect, {
        urls: ["<all_urls>"]
    },
    ["blocking"]
);

