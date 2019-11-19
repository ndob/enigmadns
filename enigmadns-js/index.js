import getEnigmaInit from "./getEnigmaInit.js";
import {
    Enigma,
    utils,
    eeConstants
} from 'enigma-js';

const abi = require('ethereumjs-abi');
const BN = require('bn.js');

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

    isInitialized() {
        return this.enigmaInitialized;
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

    async tryRegister(domain, userId) {
        let result = await this.makeCall('register(string,string)', [
            [domain, 'string'],
            [userId, 'string']
        ], 'int256');

        this.printResult("register", result[0]);
        return result[0] && result[0].toNumber() === EnigmaDNSErrorCode.None.toNumber();
    }

    async resolve(domain) {
        let result = await this.makeCall('resolve(string)', [
            [domain, 'string']
        ], 'string');
        // this.printResult("resolve", result);
        return result[0];
    }

    async setTarget(domain, target, userId) {
        let result = await this.makeCall('set_target(string,string,string)', [
            [domain, 'string'],
            [target, 'string'],
            [userId, 'string']
        ], 'int256');
        this.printResult("setTarget", result[0]);
        return result[0] && result[0].toNumber() === EnigmaDNSErrorCode.None.toNumber();
    }

    printResult(caller, result) {
        if (!result) {
            console.log("Unknown error");
            return;
        }

        switch (result.toNumber()) {
            case EnigmaDNSErrorCode.None.toNumber():
                console.log("Call successful:" + caller);
                break;
            case EnigmaDNSErrorCode.AlreadyRegistered.toNumber():
                console.log("Already registered:" + caller);
                break;
            case EnigmaDNSErrorCode.Unauthorized.toNumber():
                console.log("Unauthorized:" + caller);
                break;
        }
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

export { EnigmaDNS };
